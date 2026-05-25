"use client"

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react"
import { ChevronDownMini, Funnel } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString(name, value)
    router.push(`${pathname}?${query}`)
  }

  return (
    <Disclosure as="div" className="relative z-30 flex justify-end">
      {({ open }) => (
        <>
          <DisclosureButton
            className="inline-flex h-8 items-center gap-x-2 rounded-rounded border border-ui-border-base bg-white px-3 text-small-regular text-ui-fg-subtle shadow-borders-base transition-colors hover:bg-ui-bg-base-hover hover:text-ui-fg-base focus:outline-none focus-visible:shadow-borders-interactive-with-active"
            data-testid="filters-toggle"
          >
            <Funnel className="h-4 w-4" />
            Filters
            <ChevronDownMini
              className={clx("h-4 w-4 transition-transform", {
                "rotate-180": open,
              })}
            />
          </DisclosureButton>
          <DisclosurePanel className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-[260px] rounded-rounded border border-ui-border-base bg-white p-4 text-left shadow-elevation-card-rest">
            <SortProducts
              sortBy={sortBy}
              setQueryParams={setQueryParams}
              data-testid={dataTestId}
            />
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}

export default RefinementList
