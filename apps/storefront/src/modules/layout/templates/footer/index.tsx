import { listTopLevelCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  }).catch(() => ({ collections: [], count: 0 }))
  const footerCategories = (
    await listTopLevelCategories({
      fields: "id,name,handle,*parent_category",
    }).catch(() => [])
  ).slice(0, 6)
  const featuredCategoryNames = footerCategories
    .slice(0, 3)
    .map((category) => category.name)
    .join(", ")

  return (
    <footer className="w-full border-t border-ui-border-base bg-white">
      <div className="content-container flex w-full flex-col">
        <div className="grid grid-cols-1 gap-10 py-14 small:grid-cols-[1fr_2fr_1.4fr] small:py-20">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus text-ui-fg-base hover:text-ui-fg-subtle uppercase"
            >
              Vuelta Dance
            </LocalizedClientLink>
            <p className="mt-4 max-w-xs text-small-regular text-ui-fg-subtle">
              {featuredCategoryNames
                ? `Browse ${featuredCategoryNames} from the current catalog.`
                : "Browse products from the current catalog."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-small-regular small:grid-cols-3">
            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus text-ui-fg-base">Shop</span>
              <ul
                className="grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small"
                data-testid="footer-categories"
              >
                {footerCategories.length > 0 ? (
                  footerCategories.map((category) => (
                    <li key={category.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/categories/${category.handle}`}
                        data-testid="category-link"
                      >
                        {category.name}
                      </LocalizedClientLink>
                    </li>
                  ))
                ) : (
                  <li>
                    <LocalizedClientLink
                      className="hover:text-ui-fg-base"
                      href="/store"
                      data-testid="category-link"
                    >
                      All products
                    </LocalizedClientLink>
                  </li>
                )}
              </ul>
            </div>

            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus text-ui-fg-base">
                  Collections
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    }
                  )}
                >
                  {collections?.slice(0, 6).map((collection) => (
                    <li key={collection.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/collections/${collection.handle}`}
                      >
                        {collection.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus text-ui-fg-base">Service</span>
              <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                <li>
                  <LocalizedClientLink
                    href="/store"
                    className="hover:text-ui-fg-base"
                  >
                    Fit guide
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account"
                    className="hover:text-ui-fg-base"
                  >
                    Order status
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/cart"
                    className="hover:text-ui-fg-base"
                  >
                    Cart
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
          </div>

          <div id="newsletter">
            <p className="txt-small-plus text-ui-fg-base">Newsletter</p>
            <p className="mt-3 text-small-regular text-ui-fg-subtle">
              Get fit notes, restock alerts, and 10% off your first order.
            </p>
            <form className="mt-5 flex flex-col gap-3 xsmall:flex-row">
              <label className="sr-only" htmlFor="footer-email">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="Email address"
                className="min-h-12 flex-1 rounded-base border border-ui-border-base px-4 text-small-regular outline-none transition focus:border-grey-90"
              />
              <button
                type="submit"
                className="min-h-12 rounded-base bg-grey-90 px-5 text-small-semi uppercase text-white transition hover:bg-grey-80"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 border-t border-ui-border-base py-6 text-ui-fg-muted small:flex-row small:items-center small:justify-between">
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} Vuelta Dance. All rights reserved.
          </Text>
          <div className="flex flex-wrap gap-2 text-xsmall-regular uppercase text-ui-fg-subtle">
            <span className="rounded-base border border-ui-border-base px-2 py-1">
              Visa
            </span>
            <span className="rounded-base border border-ui-border-base px-2 py-1">
              Mastercard
            </span>
            <span className="rounded-base border border-ui-border-base px-2 py-1">
              Apple Pay
            </span>
            <span className="rounded-base border border-ui-border-base px-2 py-1">
              PayPal
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
