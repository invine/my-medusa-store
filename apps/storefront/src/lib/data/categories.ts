import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions, getStorefrontCache } from "./cookies"

type CategoryListQuery = HttpTypes.FindParams &
  HttpTypes.StoreProductCategoryListParams

const DEFAULT_CATEGORY_FIELDS =
  "*category_children, *products, *parent_category, *parent_category.parent_category"

export const listCategories = async (query: CategoryListQuery = {}) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query.limit || 100

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      "/store/product-categories",
      {
        query: {
          fields: DEFAULT_CATEGORY_FIELDS,
          limit,
          ...query,
        },
        next,
        cache: getStorefrontCache(),
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const listTopLevelCategories = async (
  query: CategoryListQuery = {}
) => {
  const categories = await listCategories(query)

  return categories.filter((category) => !category.parent_category)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: getStorefrontCache(),
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
