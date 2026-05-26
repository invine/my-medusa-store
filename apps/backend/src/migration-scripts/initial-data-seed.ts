import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  createStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";

import setupUaeRegion from "../scripts/setup-uae-region";

type AnyRecord = Record<string, any>;

const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel";
const DEFAULT_PUBLISHABLE_API_KEY_TITLE = "Default Publishable API Key";

function isDuplicateError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("duplicate") ||
    message.includes("already exists") ||
    message.includes("unique constraint") ||
    message.includes("violates unique constraint")
  );
}

function redactKey(key: string) {
  return [key.slice(0, 6), key.slice(-3)].join("***");
}

function getConfiguredPublishableKey() {
  return (
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    process.env.PUBLISHABLE_API_KEY ||
    ""
  ).trim();
}

async function listAll<T>(
  query: AnyRecord,
  entity: string,
  fields: string[],
  filters?: AnyRecord,
) {
  const take = 100;
  let skip = 0;
  const results: T[] = [];

  while (true) {
    const { data, metadata } = await query.graph({
      entity,
      fields,
      filters,
      pagination: {
        skip,
        take,
      },
    });

    results.push(...data);

    if (!data.length || data.length < take) {
      break;
    }

    if (metadata?.count && skip + take >= metadata.count) {
      break;
    }

    skip += take;
  }

  return results;
}

async function ensureDefaultSalesChannel(
  container: MedusaContainer,
  query: AnyRecord,
  logger: AnyRecord,
) {
  const { data: existingSalesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: DEFAULT_SALES_CHANNEL_NAME },
    pagination: { take: 1 },
  });

  if (existingSalesChannels[0]) {
    logger.info(`Default sales channel exists: ${existingSalesChannels[0].id}`);
    return existingSalesChannels[0];
  }

  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: DEFAULT_SALES_CHANNEL_NAME,
          description: "Created by Medusa",
        },
      ],
    },
  });

  logger.info(`Created default sales channel: ${defaultSalesChannel.id}`);
  return defaultSalesChannel;
}

async function createPublishableKeyWithToken(
  container: MedusaContainer,
  token: string,
) {
  const apiKeyModuleService = container.resolve(Modules.API_KEY) as AnyRecord;

  if (!apiKeyModuleService.apiKeyService_) {
    throw new Error("API key module internals are unavailable.");
  }

  const created = await apiKeyModuleService.apiKeyService_.create({
    title: DEFAULT_PUBLISHABLE_API_KEY_TITLE,
    type: "publishable",
    created_by: "",
    token,
    salt: "",
    redacted: redactKey(token),
  });

  if (apiKeyModuleService.baseRepository_) {
    return apiKeyModuleService.baseRepository_.serialize(created, {
      populate: true,
    });
  }

  return created;
}

async function ensurePublishableApiKey(
  container: MedusaContainer,
  query: AnyRecord,
  salesChannel: AnyRecord,
  logger: AnyRecord,
) {
  const configuredToken = getConfiguredPublishableKey();

  if (configuredToken && !configuredToken.startsWith("pk_")) {
    throw new Error("Configured publishable API key must start with pk_.");
  }

  const publishableApiKeys = await listAll<AnyRecord>(query, "api_key", [
    "id",
    "title",
    "token",
    "type",
    "revoked_at",
    "sales_channels.id",
  ]);
  const publishableKeys = publishableApiKeys.filter(
    (apiKey) => apiKey.type === "publishable" && !apiKey.revoked_at,
  );

  if (
    configuredToken &&
    publishableApiKeys.some(
      (apiKey) =>
        apiKey.type === "publishable" &&
        apiKey.token === configuredToken &&
        apiKey.revoked_at,
    )
  ) {
    throw new Error("Configured publishable API key exists but is revoked.");
  }

  let publishableApiKey = configuredToken
    ? publishableKeys.find((apiKey) => apiKey.token === configuredToken)
    : publishableKeys[0];

  if (!publishableApiKey) {
    if (configuredToken) {
      try {
        publishableApiKey = await createPublishableKeyWithToken(
          container,
          configuredToken,
        );
        logger.info(
          `Created configured publishable API key: ${redactKey(configuredToken)}`,
        );
      } catch (error) {
        if (!isDuplicateError(error)) {
          throw error;
        }

        const keysAfterDuplicate = await listAll<AnyRecord>(query, "api_key", [
          "id",
          "title",
          "token",
          "type",
          "revoked_at",
          "sales_channels.id",
        ]);
        publishableApiKey = keysAfterDuplicate.find(
          (apiKey) =>
            apiKey.type === "publishable" &&
            apiKey.token === configuredToken &&
            !apiKey.revoked_at,
        );
      }
    } else {
      const {
        result: [createdPublishableApiKey],
      } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            {
              title: DEFAULT_PUBLISHABLE_API_KEY_TITLE,
              type: "publishable",
              created_by: "",
            },
          ],
        },
      });
      publishableApiKey = createdPublishableApiKey;
      logger.info(
        `Created generated publishable API key: ${publishableApiKey.token}`,
      );
    }
  } else {
    logger.info(
      `Publishable API key exists: ${redactKey(publishableApiKey.token)}`,
    );
  }

  if (!publishableApiKey) {
    throw new Error("Unable to ensure publishable API key.");
  }

  const alreadyLinked = publishableApiKey.sales_channels?.some(
    (linkedSalesChannel: AnyRecord) =>
      linkedSalesChannel.id === salesChannel.id,
  );

  if (!alreadyLinked) {
    try {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: publishableApiKey.id,
          add: [salesChannel.id],
        },
      });
      logger.info("Linked publishable API key to default sales channel.");
    } catch (error) {
      if (!isDuplicateError(error)) {
        throw error;
      }

      logger.info(
        "Publishable API key is already linked to the default sales channel.",
      );
    }
  }

  return publishableApiKey;
}

async function ensureStore(
  container: MedusaContainer,
  query: AnyRecord,
  salesChannel: AnyRecord,
  logger: AnyRecord,
) {
  const { data: existingStores } = await query.graph({
    entity: "store",
    fields: ["id", "name"],
    pagination: { take: 1 },
  });

  if (existingStores[0]) {
    logger.info(`Store exists: ${existingStores[0].id}`);
    return existingStores[0];
  }

  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Default Store",
          supported_currencies: [
            {
              currency_code: "aed",
              is_default: true,
            },
            {
              currency_code: "usd",
              is_default: false,
            },
            {
              currency_code: "eur",
              is_default: false,
            },
          ],
          default_sales_channel_id: salesChannel.id,
        },
      ],
    },
  });

  logger.info(`Created default store: ${store.id}`);
  return store;
}

async function ensureProductCategories(
  container: MedusaContainer,
  query: AnyRecord,
) {
  const productCategories = [
    {
      name: "Shirts",
      is_active: true,
    },
    {
      name: "Sweatshirts",
      is_active: true,
    },
    {
      name: "Pants",
      is_active: true,
    },
    {
      name: "Merch",
      is_active: true,
    },
  ];
  const existingCategories = await listAll<AnyRecord>(
    query,
    "product_category",
    ["id", "name"],
  );
  const missingCategories = productCategories.filter(
    (category) =>
      !existingCategories.some(
        (existingCategory) => existingCategory.name === category.name,
      ),
  );

  if (!missingCategories.length) {
    return existingCategories.filter((category) =>
      productCategories.some(
        (productCategory) => productCategory.name === category.name,
      ),
    );
  }

  const { result: createdCategories } = await createProductCategoriesWorkflow(
    container,
  ).run({
    input: {
      product_categories: missingCategories,
    },
  });

  return [
    ...existingCategories.filter((category) =>
      productCategories.some(
        (productCategory) => productCategory.name === category.name,
      ),
    ),
    ...createdCategories,
  ];
}

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as AnyRecord;

  logger.info("Seeding store data...");
  const defaultSalesChannel = await ensureDefaultSalesChannel(
    container,
    query,
    logger,
  );
  await ensurePublishableApiKey(container, query, defaultSalesChannel, logger);
  await ensureStore(container, query, defaultSalesChannel, logger);

  // This is normally created by a core migration. Keep the fallback for fresh DBs.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  let shippingProfile = shippingProfileResult[0];

  if (!shippingProfile) {
    const {
      result: [createdShippingProfile],
    } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    });
    shippingProfile = createdShippingProfile;
    logger.info(`Created default shipping profile: ${shippingProfile.id}`);
  }

  logger.info("Finished seeding store data.");

  const seedProductHandles = ["t-shirt", "sweatshirt", "sweatpants", "shorts"];
  const existingProducts = await listAll<AnyRecord>(query, "product", [
    "id",
    "handle",
  ]);
  const existingProductHandles = new Set(
    existingProducts.map((product) => product.handle),
  );

  if (
    seedProductHandles.every((handle) => existingProductHandles.has(handle))
  ) {
    logger.info("Seed products already exist. Skipping product data.");
  } else {
    logger.info("Seeding product data...");

    const categoryResult = await ensureProductCategories(container, query);

    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Medusa T-Shirt",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Shirts")!.id,
            ],
            description:
              "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
            handle: "t-shirt",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
              {
                title: "Color",
                values: ["Black", "White"],
              },
            ],
            variants: [
              {
                title: "S / Black",
                sku: "SHIRT-S-BLACK",
                options: {
                  Size: "S",
                  Color: "Black",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "S / White",
                sku: "SHIRT-S-WHITE",
                options: {
                  Size: "S",
                  Color: "White",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "M / Black",
                sku: "SHIRT-M-BLACK",
                options: {
                  Size: "M",
                  Color: "Black",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "M / White",
                sku: "SHIRT-M-WHITE",
                options: {
                  Size: "M",
                  Color: "White",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "L / Black",
                sku: "SHIRT-L-BLACK",
                options: {
                  Size: "L",
                  Color: "Black",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "L / White",
                sku: "SHIRT-L-WHITE",
                options: {
                  Size: "L",
                  Color: "White",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "XL / Black",
                sku: "SHIRT-XL-BLACK",
                options: {
                  Size: "XL",
                  Color: "Black",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "XL / White",
                sku: "SHIRT-XL-WHITE",
                options: {
                  Size: "XL",
                  Color: "White",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel.id,
              },
            ],
          },
          {
            title: "Medusa Sweatshirt",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Sweatshirts")!.id,
            ],
            description:
              "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
            handle: "sweatshirt",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SWEATSHIRT-S",
                options: {
                  Size: "S",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "M",
                sku: "SWEATSHIRT-M",
                options: {
                  Size: "M",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "L",
                sku: "SWEATSHIRT-L",
                options: {
                  Size: "L",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "XL",
                sku: "SWEATSHIRT-XL",
                options: {
                  Size: "XL",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel.id,
              },
            ],
          },
          {
            title: "Medusa Sweatpants",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Pants")!.id,
            ],
            description:
              "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
            handle: "sweatpants",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SWEATPANTS-S",
                options: {
                  Size: "S",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "M",
                sku: "SWEATPANTS-M",
                options: {
                  Size: "M",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "L",
                sku: "SWEATPANTS-L",
                options: {
                  Size: "L",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "XL",
                sku: "SWEATPANTS-XL",
                options: {
                  Size: "XL",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel.id,
              },
            ],
          },
          {
            title: "Medusa Shorts",
            category_ids: [
              categoryResult.find((cat) => cat.name === "Merch")!.id,
            ],
            description:
              "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
            handle: "shorts",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SHORTS-S",
                options: {
                  Size: "S",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "M",
                sku: "SHORTS-M",
                options: {
                  Size: "M",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "L",
                sku: "SHORTS-L",
                options: {
                  Size: "L",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
              {
                title: "XL",
                sku: "SHORTS-XL",
                options: {
                  Size: "XL",
                },
                prices: [
                  {
                    amount: 10,
                    currency_code: "eur",
                  },
                  {
                    amount: 15,
                    currency_code: "usd",
                  },
                ],
              },
            ],
            sales_channels: [
              {
                id: defaultSalesChannel.id,
              },
            ],
          },
        ].filter((product) => !existingProductHandles.has(product.handle)),
      },
    });
    logger.info("Finished seeding product data.");
  }

  logger.info("Ensuring UAE commerce setup.");
  await setupUaeRegion({ container });
}
