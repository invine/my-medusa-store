import { Suspense } from "react"

import { listTopLevelCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"

export default async function Nav() {
  const navCategories = await listTopLevelCategories({
    fields: "id,name,handle,*parent_category",
  }).catch(() => [])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-white/95 border-ui-border-base backdrop-blur">
        <nav
          className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between gap-x-6 w-full h-full text-small-regular"
          aria-label="Main navigation"
        >
          <LocalizedClientLink
            href="/"
            className="txt-compact-xlarge-plus hover:text-ui-fg-base uppercase whitespace-nowrap"
            data-testid="nav-store-link"
          >
            Vuelta Dance
          </LocalizedClientLink>

          <div className="no-scrollbar flex flex-1 items-center gap-x-6 h-full overflow-x-auto whitespace-nowrap">
            {navCategories.length > 0 ? (
              navCategories.map((category) => (
                <LocalizedClientLink
                  key={category.id}
                  className="hover:text-ui-fg-base"
                  href={`/categories/${category.handle}`}
                  data-testid="nav-category-link"
                >
                  {category.name}
                </LocalizedClientLink>
              ))
            ) : (
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/store"
                data-testid="nav-store-fallback-link"
              >
                Store
              </LocalizedClientLink>
            )}
          </div>

          <div className="flex items-center gap-x-6 h-full justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
