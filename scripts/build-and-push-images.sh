#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VALUES_FILE="${VALUES_FILE:-charts/medusa/values-staging.yaml}"
PLATFORMS="${PLATFORMS:-linux/arm64}"
DRY_RUN="${DRY_RUN:-false}"

cd "$ROOT_DIR"

fail() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

to_bool() {
  case "${1:-}" in
    1 | true | TRUE | yes | YES) return 0 ;;
    *) return 1 ;;
  esac
}

yaml_value() {
  local section="$1"
  local key="$2"
  local file="$3"

  awk -v section="$section" -v key="$key" '
    $0 ~ ("^" section ":[[:space:]]*$") {
      in_section = 1
      next
    }
    in_section && $0 ~ /^[^[:space:]]/ {
      exit
    }
    in_section {
      wanted = "^[[:space:]]{2}" key ":[[:space:]]*"
      if ($0 ~ wanted) {
        sub(wanted, "")
        gsub(/^"|"$/, "")
        print
        exit
      }
    }
  ' "$file"
}

image_repository() {
  local component="$1"
  local file="$2"

  awk -v component="$component" '
    /^images:[[:space:]]*$/ {
      in_images = 1
      next
    }
    in_images && /^[^[:space:]]/ {
      exit
    }
    in_images && $0 ~ ("^[[:space:]]{2}" component ":[[:space:]]*$") {
      in_component = 1
      next
    }
    in_component && $0 ~ /^[[:space:]]{2}[A-Za-z0-9_-]+:[[:space:]]*$/ {
      exit
    }
    in_component && /^[[:space:]]{4}repository:[[:space:]]*/ {
      sub(/^[[:space:]]{4}repository:[[:space:]]*/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$file"
}

buildx() {
  if to_bool "$DRY_RUN"; then
    printf '+'
    printf ' %q' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

update_values_tag() {
  local file="$1"
  local tag="$2"
  local tmp

  tmp="$(mktemp "${file}.XXXXXX")"

  if ! awk -v tag="$tag" '
    /^images:[[:space:]]*$/ {
      in_images = 1
      print
      next
    }
    in_images && /^[^[:space:]]/ {
      in_images = 0
      in_component = 0
    }
    in_images && /^[[:space:]]{2}(backend|storefront):[[:space:]]*$/ {
      in_component = 1
      print
      next
    }
    in_images && in_component && /^[[:space:]]{4}tag:[[:space:]]*/ {
      print "    tag: " tag
      updated++
      in_component = 0
      next
    }
    {
      print
    }
    END {
      if (updated != 2) {
        print "expected to update 2 image tags, updated " updated > "/dev/stderr"
        exit 1
      }
    }
  ' "$file" > "$tmp"; then
    rm -f "$tmp"
    return 1
  fi

  mv "$tmp" "$file"
}

require_command awk
require_command date
require_command docker
require_command git
require_command mktemp
require_command sudo

[[ -f "$VALUES_FILE" ]] || fail "values file not found: $VALUES_FILE"
[[ -f docker/backend.Dockerfile ]] || fail "missing docker/backend.Dockerfile"
[[ -f docker/storefront.Dockerfile ]] || fail "missing docker/storefront.Dockerfile"

GIT_SHA="$(git rev-parse --short=12 HEAD 2>/dev/null || true)"
[[ -n "$GIT_SHA" ]] || fail "unable to determine git commit SHA"

TAG="${TAG:-}"
if [[ -z "$TAG" ]]; then
  timestamp="$(date -u +%Y%m%d%H%M%S)"
  TAG="${timestamp}-${GIT_SHA}"

  if ! git diff --quiet --ignore-submodules -- || ! git diff --cached --quiet --ignore-submodules --; then
    TAG="${TAG}-dirty"
  fi
fi

[[ "$TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || fail "invalid Docker tag: $TAG"

BACKEND_IMAGE="${BACKEND_IMAGE:-$(image_repository backend "$VALUES_FILE")}"
STOREFRONT_IMAGE="${STOREFRONT_IMAGE:-$(image_repository storefront "$VALUES_FILE")}"

[[ -n "$BACKEND_IMAGE" ]] || fail "unable to read images.backend.repository from $VALUES_FILE"
[[ -n "$STOREFRONT_IMAGE" ]] || fail "unable to read images.storefront.repository from $VALUES_FILE"

backend_build=(
  sudo docker buildx build
  --platform "$PLATFORMS"
  --file docker/backend.Dockerfile
  --target prod
  --tag "$BACKEND_IMAGE:$TAG"
  --push
  .
)

storefront_build=(
  sudo docker buildx build
  --platform "$PLATFORMS"
  --file docker/storefront.Dockerfile
  --target prod
  --tag "$STOREFRONT_IMAGE:$TAG"
)

backend_public_url="${NEXT_PUBLIC_MEDUSA_BACKEND_URL:-$(yaml_value config backendPublicUrl "$VALUES_FILE")}"
storefront_public_url="${NEXT_PUBLIC_BASE_URL:-$(yaml_value config storefrontPublicUrl "$VALUES_FILE")}"
default_region="${NEXT_PUBLIC_DEFAULT_REGION:-$(yaml_value config defaultRegion "$VALUES_FILE")}"
stripe_key="${NEXT_PUBLIC_STRIPE_KEY:-$(yaml_value config stripeKey "$VALUES_FILE")}"
publishable_key="${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}"

[[ -n "$backend_public_url" ]] && storefront_build+=(--build-arg "NEXT_PUBLIC_MEDUSA_BACKEND_URL=$backend_public_url")
[[ -n "$storefront_public_url" ]] && storefront_build+=(--build-arg "NEXT_PUBLIC_BASE_URL=$storefront_public_url")
[[ -n "$default_region" ]] && storefront_build+=(--build-arg "NEXT_PUBLIC_DEFAULT_REGION=$default_region")
[[ -n "$stripe_key" ]] && storefront_build+=(--build-arg "NEXT_PUBLIC_STRIPE_KEY=$stripe_key")
[[ -n "$publishable_key" ]] && storefront_build+=(--build-arg "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$publishable_key")

storefront_build+=(--push .)

echo "Using tag: $TAG"
echo "Backend image: $BACKEND_IMAGE:$TAG"
echo "Storefront image: $STOREFRONT_IMAGE:$TAG"
echo "Helm values file: $VALUES_FILE"
echo "Platforms: $PLATFORMS"

buildx "${backend_build[@]}"
buildx "${storefront_build[@]}"

if to_bool "$DRY_RUN"; then
  echo "Dry run complete; $VALUES_FILE was not changed."
else
  update_values_tag "$VALUES_FILE" "$TAG"
  echo "Updated $VALUES_FILE to tag $TAG."
fi
