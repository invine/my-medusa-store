import { listTopLevelCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const PRODUCT_FIELDS =
  "*images,*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,*categories,*collection"

const getProductImage = (product?: HttpTypes.StoreProduct | null) => {
  return product?.thumbnail || product?.images?.[0]?.url || null
}

const getCategoryImage = (category: HttpTypes.StoreProductCategory) => {
  const productWithImage = category.products?.find((product) =>
    Boolean(getProductImage(product))
  )

  return getProductImage(productWithImage)
}

const truncate = (value?: string | null, maxLength = 110) => {
  if (!value) {
    return ""
  }

  return value.length > maxLength
    ? `${value.slice(0, maxLength).trim()}...`
    : value
}

const getProductLabel = (product: HttpTypes.StoreProduct) => {
  return product.categories?.[0]?.name || product.collection?.title || "Product"
}

type HomeProps = {
  countryCode: string
}

export default async function DanceShopMockup({ countryCode }: HomeProps) {
  const [categories, collectionsResult, region, productsResult] =
    await Promise.all([
      listTopLevelCategories({
        fields:
          "*category_children,*products,*products.images,*parent_category,*parent_category.parent_category",
      }).catch(() => []),
      listCollections({ fields: "*products" }).catch(() => ({
        collections: [],
        count: 0,
      })),
      getRegion(countryCode).catch(() => null),
      listProducts({
        countryCode,
        queryParams: {
          limit: 4,
          order: "-created_at",
          fields: PRODUCT_FIELDS,
        },
      }).catch(() => null),
    ])

  const topLevelCategories = categories.slice(0, 5)
  const featuredProducts = productsResult?.response.products ?? []
  const productCount = productsResult?.response.count ?? featuredProducts.length
  const collections = collectionsResult.collections.slice(0, 6)
  const heroProduct =
    featuredProducts.find((product) => Boolean(getProductImage(product))) ||
    featuredProducts[0]
  const heroImage = getProductImage(heroProduct)
  const heroCategory = topLevelCategories[0]
  const heroTitle =
    heroProduct?.title || heroCategory?.name || "Browse the catalog"
  const heroDescription =
    truncate(heroProduct?.description, 180) ||
    heroCategory?.description ||
    "Explore the latest products available for your selected region."
  const primaryHref = heroProduct?.handle
    ? `/products/${heroProduct.handle}`
    : "/store"
  const secondaryHref = heroCategory?.handle
    ? `/categories/${heroCategory.handle}`
    : "/store"

  const storeSignals = [
    {
      label: "Products",
      value: productCount.toString(),
      detail: "Available now",
    },
    {
      label: "Categories",
      value: topLevelCategories.length.toString(),
      detail: "Ways to browse",
    },
    {
      label: "Collections",
      value: collectionsResult.count.toString(),
      detail: "Curated groups",
    },
    {
      label: region?.name || "Region",
      value: region?.currency_code?.toUpperCase() || "-",
      detail: "Pricing context",
    },
  ]

  return (
    <div className="bg-white text-ui-fg-base">
      <section className="relative min-h-[calc(100svh-6rem)] overflow-hidden bg-grey-90 text-white small:min-h-[calc(100svh-8rem)]">
        {heroImage && (
          <img
            src={heroImage}
            alt={heroTitle}
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-grey-90 via-grey-90/45 to-grey-90/10" />

        <div className="content-container relative z-10 flex min-h-[calc(100svh-6rem)] flex-col justify-end pb-8 pt-24 small:min-h-[calc(100svh-8rem)] small:pb-12">
          <div className="max-w-3xl">
            <p className="mb-4 text-small-semi uppercase text-white/80">
              {region?.name ? `${region.name} catalog` : "Store catalog"}
            </p>
            <h1 className="break-words text-[44px] font-normal leading-[48px] small:text-[68px] small:leading-[72px]">
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base-regular text-white/85 small:text-large-regular">
              {heroDescription}
            </p>
            <div className="mt-8 flex flex-col gap-3 xsmall:flex-row">
              <LocalizedClientLink
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center rounded-base bg-white px-6 py-3 text-center text-small-semi uppercase text-grey-90 transition hover:bg-grey-10"
              >
                {heroProduct ? "View featured product" : "Shop products"}
              </LocalizedClientLink>
              <LocalizedClientLink
                href={secondaryHref}
                className="inline-flex min-h-12 items-center justify-center rounded-base border border-white px-6 py-3 text-center text-small-semi uppercase text-white transition hover:bg-white hover:text-grey-90"
              >
                {heroCategory ? `Explore ${heroCategory.name}` : "Browse store"}
              </LocalizedClientLink>
            </div>
          </div>

          {topLevelCategories.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-3 border-t border-white/30 pt-5 text-small-regular text-white/80 small:grid-cols-5">
              {topLevelCategories.map((category) => (
                <LocalizedClientLink
                  key={category.id}
                  href={`/categories/${category.handle}`}
                  className="break-words transition hover:text-white"
                >
                  {category.name}
                </LocalizedClientLink>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-ui-border-base bg-white py-12 small:py-16">
        <div className="content-container">
          <div className="mb-8 flex flex-col justify-between gap-4 small:flex-row small:items-end">
            <div>
              <p className="mb-2 text-small-semi uppercase text-ui-fg-muted">
                Browse categories
              </p>
              <h2 className="text-2xl-regular text-ui-fg-base">
                Shop by category
              </h2>
            </div>
            <LocalizedClientLink
              href="/store"
              className="text-small-semi uppercase text-ui-fg-subtle transition hover:text-ui-fg-base"
            >
              View all products
            </LocalizedClientLink>
          </div>

          {topLevelCategories.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2 small:grid-cols-5">
              {topLevelCategories.map((category) => {
                const image = getCategoryImage(category)

                return (
                  <article
                    key={category.id}
                    className="group overflow-hidden rounded-base border border-ui-border-base bg-white"
                  >
                    <LocalizedClientLink
                      href={`/categories/${category.handle}`}
                      className="block"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-ui-bg-subtle">
                        {image ? (
                          <img
                            src={image}
                            alt={category.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center break-words px-4 text-center text-large-semi text-ui-fg-muted">
                            {category.name}
                          </div>
                        )}
                      </div>
                      <div className="min-h-[136px] p-4">
                        <h3 className="break-words text-large-semi text-ui-fg-base">
                          {category.name}
                        </h3>
                        <p className="mt-2 text-small-regular text-ui-fg-subtle">
                          {truncate(
                            category.description ||
                              `${category.products?.length ?? 0} products`
                          )}
                        </p>
                      </div>
                    </LocalizedClientLink>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-base border border-ui-border-base bg-ui-bg-subtle px-4 py-8 text-center text-small-regular text-ui-fg-subtle">
              No product categories are published yet.
            </div>
          )}
        </div>
      </section>

      <section className="bg-grey-5 py-12 small:py-20">
        <div className="content-container">
          <div className="mb-8 flex flex-col justify-between gap-4 small:flex-row small:items-end">
            <div>
              <p className="mb-2 text-small-semi uppercase text-ui-fg-muted">
                New arrivals
              </p>
              <h2 className="text-2xl-regular text-ui-fg-base">
                Latest from the catalog
              </h2>
            </div>
            <LocalizedClientLink
              href="/store"
              className="text-small-semi uppercase text-ui-fg-subtle transition hover:text-ui-fg-base"
            >
              Shop all
            </LocalizedClientLink>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 xsmall:grid-cols-2 small:grid-cols-4">
              {featuredProducts.map((product) => {
                const image = getProductImage(product)
                const { cheapestPrice } = getProductPrice({ product })

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-base border border-ui-border-base bg-white"
                  >
                    <LocalizedClientLink
                      href={`/products/${product.handle}`}
                      className="block"
                    >
                      <div className="relative aspect-[4/5] bg-ui-bg-subtle">
                        {image ? (
                          <img
                            src={image}
                            alt={product.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-4 text-center text-large-semi text-ui-fg-muted">
                            {product.title}
                          </div>
                        )}
                        <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-base bg-white px-3 py-1 text-xsmall-regular uppercase text-ui-fg-base">
                          {getProductLabel(product)}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xsmall-regular uppercase text-ui-fg-muted">
                              {product.collection?.title ||
                                product.categories?.[0]?.name ||
                                region?.name ||
                                "Catalog"}
                            </p>
                            <h3 className="mt-1 break-words text-base-semi text-ui-fg-base">
                              {product.title}
                            </h3>
                          </div>
                          {cheapestPrice && (
                            <p className="text-base-semi text-ui-fg-base">
                              {cheapestPrice.calculated_price}
                            </p>
                          )}
                        </div>
                        <p className="mt-3 text-small-regular text-ui-fg-subtle">
                          {truncate(product.subtitle || product.description) ||
                            "View product details."}
                        </p>
                      </div>
                    </LocalizedClientLink>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-base border border-ui-border-base bg-white px-4 py-8 text-center text-small-regular text-ui-fg-subtle">
              No products are published for this region yet.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-12 small:py-20">
        <div className="content-container grid grid-cols-1 gap-8 small:grid-cols-[1.15fr_0.85fr] small:items-stretch">
          <div className="overflow-hidden rounded-base bg-ui-bg-subtle">
            {heroImage ? (
              <img
                src={heroImage}
                alt={heroTitle}
                className="h-full min-h-[420px] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-2xl-regular text-ui-fg-muted">
                {heroTitle}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center border-y border-ui-border-base py-10 small:py-0">
            <p className="mb-3 text-small-semi uppercase text-ui-fg-muted">
              Store overview
            </p>
            <h2 className="text-2xl-regular text-ui-fg-base">
              {region?.name
                ? `Shopping context for ${region.name}`
                : "Shopping context"}
            </h2>
            <p className="mt-5 text-base-regular text-ui-fg-subtle">
              {collections.length
                ? `Browse ${collections.length} collection${
                    collections.length === 1 ? "" : "s"
                  } and ${topLevelCategories.length} categor${
                    topLevelCategories.length === 1 ? "y" : "ies"
                  } in the current catalog.`
                : `Browse ${productCount} product${
                    productCount === 1 ? "" : "s"
                  } available in the current catalog.`}
            </p>

            {collections.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {collections.map((collection) => (
                  <LocalizedClientLink
                    key={collection.id}
                    href={`/collections/${collection.handle}`}
                    className="break-words rounded-base border border-ui-border-base px-3 py-2 text-small-regular text-ui-fg-subtle transition hover:text-ui-fg-base"
                  >
                    {collection.title}
                  </LocalizedClientLink>
                ))}
              </div>
            )}

            <LocalizedClientLink
              href="/store"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-base bg-grey-90 px-6 py-3 text-small-semi uppercase text-white transition hover:bg-grey-80 xsmall:w-fit"
            >
              Open catalog
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      <section className="border-y border-ui-border-base bg-grey-90 py-10 text-white">
        <div className="content-container grid grid-cols-1 gap-6 small:grid-cols-4">
          {storeSignals.map((signal) => (
            <div key={signal.label}>
              <p className="text-2xl-regular">{signal.value}</p>
              <p className="mt-1 text-base-semi">{signal.label}</p>
              <p className="mt-2 text-small-regular text-white/65">
                {signal.detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
