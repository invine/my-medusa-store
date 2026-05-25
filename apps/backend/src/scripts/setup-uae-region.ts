import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
  upsertVariantPricesWorkflow,
} from "@medusajs/medusa/core-flows";

type ScriptInput = {
  container: MedusaContainer;
  args?: string[];
};

type AnyRecord = Record<string, any>;

const UAE_COUNTRY_CODE = "ae";
const UAE_CURRENCY_CODE = "aed";
const UAE_REGION_NAME = "United Arab Emirates";
const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel";
const DEFAULT_PAYMENT_PROVIDER_ID = "pp_system_default";
const DEFAULT_TAX_PROVIDER_ID = "tp_system";
const MANUAL_FULFILLMENT_PROVIDER_ID = "manual_manual";
const UAE_STOCK_LOCATION_NAME = "UAE Warehouse";
const UAE_FULFILLMENT_SET_NAME = "UAE Warehouse delivery";
const UAE_SERVICE_ZONE_NAME = "United Arab Emirates";

const DEFAULT_PRODUCT_AED_PRICE = Number(
  process.env.DEFAULT_PRODUCT_AED_PRICE ?? "50",
);
const USD_TO_AED_MULTIPLIER = Number(
  process.env.USD_TO_AED_MULTIPLIER ?? "3.67",
);
const EUR_TO_AED_MULTIPLIER = Number(process.env.EUR_TO_AED_MULTIPLIER ?? "4");
const UAE_STANDARD_SHIPPING_AMOUNT = Number(
  process.env.UAE_STANDARD_SHIPPING_AMOUNT ?? "20",
);
const UAE_EXPRESS_SHIPPING_AMOUNT = Number(
  process.env.UAE_EXPRESS_SHIPPING_AMOUNT ?? "35",
);
const UAE_STOCKED_QUANTITY = Number(
  process.env.UAE_STOCKED_QUANTITY ?? "1000000",
);

const UAE_EMIRATES = [
  { name: "Abu Dhabi", province_code: "ae-az" },
  { name: "Dubai", province_code: "ae-du" },
  { name: "Sharjah", province_code: "ae-sh" },
  { name: "Ajman", province_code: "ae-aj" },
  { name: "Umm Al Quwain", province_code: "ae-uq" },
  { name: "Ras Al Khaimah", province_code: "ae-rk" },
  { name: "Fujairah", province_code: "ae-fu" },
];

const SHIPPING_OPTIONS = [
  {
    name: "UAE Standard Shipping",
    amount: UAE_STANDARD_SHIPPING_AMOUNT,
    label: "Standard",
    description: "UAE delivery in 2-3 days.",
    code: "uae-standard",
  },
  {
    name: "UAE Express Shipping",
    amount: UAE_EXPRESS_SHIPPING_AMOUNT,
    label: "Express",
    description: "UAE delivery in 24 hours.",
    code: "uae-express",
  },
];

function isDuplicateLinkError(error: unknown) {
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

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value && typeof value === "object") {
    const raw = value as AnyRecord;
    return toNumber(raw.value ?? raw.numeric ?? raw.raw ?? raw.amount);
  }

  return null;
}

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

function getAEDAmountFromPrices(prices: AnyRecord[]) {
  const usdPrice = prices.find((price) => price.currency_code === "usd");
  const eurPrice = prices.find((price) => price.currency_code === "eur");
  const sourcePrice = usdPrice ?? eurPrice;

  if (!sourcePrice) {
    return DEFAULT_PRODUCT_AED_PRICE;
  }

  const amount = toNumber(sourcePrice.amount);

  if (!amount) {
    return DEFAULT_PRODUCT_AED_PRICE;
  }

  const multiplier =
    sourcePrice.currency_code === "eur"
      ? EUR_TO_AED_MULTIPLIER
      : USD_TO_AED_MULTIPLIER;

  return roundPrice(amount * multiplier);
}

function getBasePriceInputs(prices: AnyRecord[]) {
  return prices
    .filter((price) => !price.price_list_id)
    .map((price) => {
      const input: AnyRecord = {
        id: price.id,
        currency_code: price.currency_code,
        amount: toNumber(price.amount) ?? price.amount,
      };
      const minQuantity = toNumber(price.min_quantity);
      const maxQuantity = toNumber(price.max_quantity);

      if (minQuantity !== null) {
        input.min_quantity = minQuantity;
      }

      if (maxQuantity !== null) {
        input.max_quantity = maxQuantity;
      }

      return input;
    });
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

async function ensureLink(
  link: AnyRecord,
  linkDefinition: AnyRecord,
  logger: AnyRecord,
  label: string,
) {
  try {
    await link.create(linkDefinition);
    logger.info(`Linked ${label}.`);
  } catch (error) {
    if (!isDuplicateLinkError(error)) {
      throw error;
    }

    logger.info(`Link already exists for ${label}.`);
  }
}

async function ensureSalesChannel(
  container: MedusaContainer,
  query: AnyRecord,
) {
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "default_sales_channel_id"],
    pagination: { take: 1 },
  });

  const defaultSalesChannelId = stores[0]?.default_sales_channel_id;

  if (defaultSalesChannelId) {
    const { data: salesChannels } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
      filters: { id: defaultSalesChannelId },
      pagination: { take: 1 },
    });

    if (salesChannels[0]) {
      return salesChannels[0];
    }
  }

  const { data: matchingSalesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: DEFAULT_SALES_CHANNEL_NAME },
    pagination: { take: 1 },
  });

  if (matchingSalesChannels[0]) {
    return matchingSalesChannels[0];
  }

  const {
    result: [createdSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: DEFAULT_SALES_CHANNEL_NAME,
          description: "Created by UAE setup script",
        },
      ],
    },
  });

  return createdSalesChannel;
}

async function ensureRegion(
  container: MedusaContainer,
  query: AnyRecord,
  logger: AnyRecord,
) {
  const regions = await listAll<AnyRecord>(query, "region", [
    "id",
    "name",
    "currency_code",
    "countries.iso_2",
  ]);

  const existingRegion = regions.find((region) =>
    region.countries?.some(
      (country: AnyRecord) => country.iso_2 === UAE_COUNTRY_CODE,
    ),
  );

  if (existingRegion) {
    const {
      result: [region],
    } = await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: existingRegion.id },
        update: {
          name: UAE_REGION_NAME,
          currency_code: UAE_CURRENCY_CODE,
          countries: [UAE_COUNTRY_CODE],
          payment_providers: [DEFAULT_PAYMENT_PROVIDER_ID],
        },
      },
    });

    logger.info(`Updated existing UAE region: ${region.id}`);
    return region;
  }

  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: UAE_REGION_NAME,
          currency_code: UAE_CURRENCY_CODE,
          countries: [UAE_COUNTRY_CODE],
          payment_providers: [DEFAULT_PAYMENT_PROVIDER_ID],
        },
      ],
    },
  });

  logger.info(`Created UAE region: ${region.id}`);
  return region;
}

async function ensureTaxRegion(container: MedusaContainer, logger: AnyRecord) {
  const taxModuleService = container.resolve(
    ModuleRegistrationName.TAX,
  ) as AnyRecord;
  const existingTaxRegions = await taxModuleService.listTaxRegions(
    { country_code: UAE_COUNTRY_CODE },
    { take: 1 },
  );

  if (existingTaxRegions.length) {
    logger.info(`UAE tax region already exists: ${existingTaxRegions[0].id}`);
    return existingTaxRegions[0];
  }

  const {
    result: [taxRegion],
  } = await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: UAE_COUNTRY_CODE,
        provider_id: DEFAULT_TAX_PROVIDER_ID,
      },
    ],
  });

  logger.info(`Created UAE tax region: ${taxRegion.id}`);
  return taxRegion;
}

async function ensureStockLocation(
  container: MedusaContainer,
  logger: AnyRecord,
) {
  const stockLocationModuleService = container.resolve(
    ModuleRegistrationName.STOCK_LOCATION,
  ) as AnyRecord;

  const existingStockLocations =
    await stockLocationModuleService.listStockLocations(
      { name: UAE_STOCK_LOCATION_NAME },
      { take: 1 },
    );

  if (existingStockLocations.length) {
    logger.info(
      `UAE stock location already exists: ${existingStockLocations[0].id}`,
    );
    return existingStockLocations[0];
  }

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: UAE_STOCK_LOCATION_NAME,
          address: {
            city: "Dubai",
            country_code: "AE",
            address_1: "",
          },
        },
      ],
    },
  });

  logger.info(`Created UAE stock location: ${stockLocation.id}`);
  return stockLocation;
}

async function ensureStoreDefaults(
  container: MedusaContainer,
  store: AnyRecord,
  region: AnyRecord,
  salesChannel: AnyRecord,
  stockLocation: AnyRecord,
  logger: AnyRecord,
) {
  if (!store) {
    logger.warn("No store exists. Skipping store default updates.");
    return;
  }

  const existingCurrencies = store.supported_currencies ?? [];
  const hasAED = existingCurrencies.some(
    (currency: AnyRecord) => currency.currency_code === UAE_CURRENCY_CODE,
  );
  const hasDefaultCurrency = existingCurrencies.some(
    (currency: AnyRecord) => currency.is_default,
  );

  const supportedCurrencies = hasAED
    ? existingCurrencies.map((currency: AnyRecord) => ({
        currency_code: currency.currency_code,
        is_default: Boolean(currency.is_default),
      }))
    : [
        ...existingCurrencies.map((currency: AnyRecord) => ({
          currency_code: currency.currency_code,
          is_default: Boolean(currency.is_default),
        })),
        {
          currency_code: UAE_CURRENCY_CODE,
          is_default: !hasDefaultCurrency,
        },
      ];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: supportedCurrencies,
        default_region_id: region.id,
        default_sales_channel_id: salesChannel.id,
        default_location_id: stockLocation.id,
      },
    },
  });

  logger.info(
    "Updated store defaults for UAE region, stock location, and sales channel.",
  );
}

async function ensureFulfillment(
  container: MedusaContainer,
  link: AnyRecord,
  region: AnyRecord,
  stockLocation: AnyRecord,
  logger: AnyRecord,
) {
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT,
  ) as AnyRecord;
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as AnyRecord;

  await ensureLink(
    link,
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: MANUAL_FULFILLMENT_PROVIDER_ID,
      },
    },
    logger,
    "UAE stock location to manual fulfillment provider",
  );

  const existingFulfillmentSets =
    await fulfillmentModuleService.listFulfillmentSets(
      { name: UAE_FULFILLMENT_SET_NAME },
      { take: 1, relations: ["service_zones", "service_zones.geo_zones"] },
    );

  let fulfillmentSet = existingFulfillmentSets[0];

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: UAE_FULFILLMENT_SET_NAME,
      type: "shipping",
      service_zones: [
        {
          name: UAE_SERVICE_ZONE_NAME,
          geo_zones: [
            { type: "country", country_code: UAE_COUNTRY_CODE },
            ...UAE_EMIRATES.map((emirate) => ({
              type: "province" as const,
              country_code: UAE_COUNTRY_CODE,
              province_code: emirate.province_code,
              metadata: { name: emirate.name },
            })),
          ],
        },
      ],
    });

    logger.info(`Created UAE fulfillment set: ${fulfillmentSet.id}`);
  } else {
    logger.info(`UAE fulfillment set already exists: ${fulfillmentSet.id}`);
  }

  await ensureLink(
    link,
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    },
    logger,
    "UAE stock location to UAE fulfillment set",
  );

  const serviceZones = await fulfillmentModuleService.listServiceZones(
    {
      name: UAE_SERVICE_ZONE_NAME,
      fulfillment_set: { id: fulfillmentSet.id },
    },
    { take: 1, relations: ["geo_zones"] },
  );

  let serviceZone = serviceZones[0];

  if (!serviceZone) {
    serviceZone = await fulfillmentModuleService.createServiceZones({
      name: UAE_SERVICE_ZONE_NAME,
      fulfillment_set_id: fulfillmentSet.id,
      geo_zones: [
        { type: "country", country_code: UAE_COUNTRY_CODE },
        ...UAE_EMIRATES.map((emirate) => ({
          type: "province" as const,
          country_code: UAE_COUNTRY_CODE,
          province_code: emirate.province_code,
          metadata: { name: emirate.name },
        })),
      ],
    });

    logger.info(`Created UAE service zone: ${serviceZone.id}`);
  } else {
    const existingGeoZones = serviceZone.geo_zones ?? [];
    const hasCountryZone = existingGeoZones.some(
      (geoZone: AnyRecord) =>
        geoZone.type === "country" && geoZone.country_code === UAE_COUNTRY_CODE,
    );
    const missingGeoZones = [
      ...(hasCountryZone
        ? []
        : [{ type: "country" as const, country_code: UAE_COUNTRY_CODE }]),
      ...UAE_EMIRATES.filter(
        (emirate) =>
          !existingGeoZones.some(
            (geoZone: AnyRecord) =>
              geoZone.type === "province" &&
              geoZone.country_code === UAE_COUNTRY_CODE &&
              geoZone.province_code === emirate.province_code,
          ),
      ).map((emirate) => ({
        type: "province" as const,
        country_code: UAE_COUNTRY_CODE,
        province_code: emirate.province_code,
        metadata: { name: emirate.name },
      })),
    ];

    if (missingGeoZones.length) {
      await fulfillmentModuleService.updateServiceZones(serviceZone.id, {
        geo_zones: [
          ...existingGeoZones.map((geoZone: AnyRecord) => ({ id: geoZone.id })),
          ...missingGeoZones,
        ],
      });

      serviceZone = (
        await fulfillmentModuleService.listServiceZones(
          { id: serviceZone.id },
          { take: 1, relations: ["geo_zones"] },
        )
      )[0];

      logger.info(`Added ${missingGeoZones.length} missing UAE geo zones.`);
    } else {
      logger.info("UAE service zone already includes all emirates.");
    }
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    pagination: { take: 1 },
  });

  const shippingProfile = shippingProfiles[0];

  if (!shippingProfile) {
    throw new Error(
      "No shipping profile found. Run the base seed before this script.",
    );
  }

  const existingShippingOptions =
    await fulfillmentModuleService.listShippingOptions(
      {
        service_zone: { id: serviceZone.id },
      },
      { take: 50 },
    );
  const missingShippingOptions = SHIPPING_OPTIONS.filter(
    (option) =>
      !existingShippingOptions.some(
        (existingOption: AnyRecord) => existingOption.name === option.name,
      ),
  );

  if (missingShippingOptions.length) {
    await createShippingOptionsWorkflow(container).run({
      input: missingShippingOptions.map((option) => ({
        name: option.name,
        price_type: "flat" as const,
        provider_id: MANUAL_FULFILLMENT_PROVIDER_ID,
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: option.label,
          description: option.description,
          code: option.code,
        },
        prices: [
          {
            currency_code: UAE_CURRENCY_CODE,
            amount: option.amount,
          },
          {
            region_id: region.id,
            amount: option.amount,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      })),
    });

    logger.info(
      `Created ${missingShippingOptions.length} UAE shipping options.`,
    );
  } else {
    logger.info("UAE shipping options already exist.");
  }

  return { fulfillmentSet, serviceZone };
}

async function ensurePublishableKeys(
  container: MedusaContainer,
  query: AnyRecord,
  salesChannel: AnyRecord,
  logger: AnyRecord,
) {
  const publishableApiKeys = await listAll<AnyRecord>(query, "api_key", [
    "id",
    "title",
    "type",
    "sales_channels.id",
  ]);

  const keysToLink = publishableApiKeys.filter(
    (apiKey) =>
      apiKey.type === "publishable" &&
      !apiKey.sales_channels?.some(
        (linkedSalesChannel: AnyRecord) =>
          linkedSalesChannel.id === salesChannel.id,
      ),
  );

  for (const apiKey of keysToLink) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: apiKey.id,
        add: [salesChannel.id],
      },
    });
  }

  logger.info(
    `Linked default sales channel to ${keysToLink.length} publishable API keys.`,
  );
}

async function ensureProductSalesChannelAndPrices(
  container: MedusaContainer,
  query: AnyRecord,
  salesChannel: AnyRecord,
  logger: AnyRecord,
) {
  const products = await listAll<AnyRecord>(query, "product", [
    "id",
    "title",
    "sales_channels.id",
    "variants.id",
    "variants.title",
    "variants.price_set.prices.id",
    "variants.price_set.prices.currency_code",
    "variants.price_set.prices.amount",
    "variants.price_set.prices.min_quantity",
    "variants.price_set.prices.max_quantity",
    "variants.price_set.prices.price_list_id",
  ]);

  const productsMissingSalesChannel = products.filter(
    (product) =>
      !product.sales_channels?.some(
        (linkedSalesChannel: AnyRecord) =>
          linkedSalesChannel.id === salesChannel.id,
      ),
  );

  if (productsMissingSalesChannel.length) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: {
        id: salesChannel.id,
        add: productsMissingSalesChannel.map((product) => product.id),
      },
    });
  }

  logger.info(
    `Linked ${productsMissingSalesChannel.length} products to the default sales channel.`,
  );

  const variantsMissingAEDPrice = products.flatMap((product) =>
    (product.variants ?? [])
      .filter((variant: AnyRecord) => {
        const prices = variant.price_set?.prices ?? variant.prices ?? [];
        return !prices.some(
          (price: AnyRecord) => price.currency_code === UAE_CURRENCY_CODE,
        );
      })
      .map((variant: AnyRecord) => {
        const prices = variant.price_set?.prices ?? variant.prices ?? [];
        // Updating a price set replaces base prices, so keep the existing base prices.
        const basePrices = getBasePriceInputs(prices);

        return {
          product_id: product.id,
          variant_id: variant.id,
          prices: [
            ...basePrices,
            {
              currency_code: UAE_CURRENCY_CODE,
              amount: getAEDAmountFromPrices(prices),
            },
          ],
        };
      }),
  );

  if (variantsMissingAEDPrice.length) {
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices: variantsMissingAEDPrice,
        previousVariantIds: variantsMissingAEDPrice.map(
          (variant) => variant.variant_id,
        ),
      },
    });
  }

  logger.info(
    `Added AED prices to ${variantsMissingAEDPrice.length} variants.`,
  );
}

async function ensureStockLocationSalesChannel(
  container: MedusaContainer,
  query: AnyRecord,
  stockLocation: AnyRecord,
  salesChannel: AnyRecord,
  logger: AnyRecord,
) {
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "sales_channels.id"],
    filters: { id: stockLocation.id },
    pagination: { take: 1 },
  });
  const linkedStockLocation = stockLocations[0];
  const isLinked = linkedStockLocation?.sales_channels?.some(
    (linkedSalesChannel: AnyRecord) =>
      linkedSalesChannel.id === salesChannel.id,
  );

  if (isLinked) {
    logger.info(
      "UAE stock location is already linked to the default sales channel.",
    );
    return;
  }

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [salesChannel.id],
      },
    });
  } catch (error) {
    if (!isDuplicateLinkError(error)) {
      throw error;
    }
  }

  logger.info("Linked UAE stock location to the default sales channel.");
}

async function ensureInventoryLevels(
  container: MedusaContainer,
  query: AnyRecord,
  stockLocation: AnyRecord,
  logger: AnyRecord,
) {
  const inventoryModuleService = container.resolve(
    ModuleRegistrationName.INVENTORY,
  ) as AnyRecord;
  const inventoryItems = await listAll<AnyRecord>(query, "inventory_item", [
    "id",
  ]);

  if (!inventoryItems.length) {
    logger.info("No inventory items found. Skipping UAE inventory levels.");
    return;
  }

  const existingInventoryLevels =
    await inventoryModuleService.listInventoryLevels(
      { location_id: stockLocation.id },
      { take: inventoryItems.length },
    );
  const existingInventoryItemIds = new Set(
    existingInventoryLevels.map((level: AnyRecord) => level.inventory_item_id),
  );
  const missingInventoryLevels = inventoryItems
    .filter((item) => !existingInventoryItemIds.has(item.id))
    .map((item) => ({
      location_id: stockLocation.id,
      stocked_quantity: UAE_STOCKED_QUANTITY,
      inventory_item_id: item.id,
    }));

  if (missingInventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: missingInventoryLevels,
      },
    });
  }

  logger.info(`Created ${missingInventoryLevels.length} UAE inventory levels.`);
}

export default async function setup_uae_region({ container }: ScriptInput) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK) as AnyRecord;
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as AnyRecord;
  const storeModuleService = container.resolve(
    ModuleRegistrationName.STORE,
  ) as AnyRecord;

  logger.info("Setting up UAE region...");

  const [store] = await storeModuleService.listStores(
    {},
    { take: 1, relations: ["supported_currencies"] },
  );
  const salesChannel = await ensureSalesChannel(container, query);
  const region = await ensureRegion(container, query, logger);
  await ensureTaxRegion(container, logger);

  const stockLocation = await ensureStockLocation(container, logger);
  await ensureStoreDefaults(
    container,
    store,
    region,
    salesChannel,
    stockLocation,
    logger,
  );

  await ensureStockLocationSalesChannel(
    container,
    query,
    stockLocation,
    salesChannel,
    logger,
  );

  await ensureFulfillment(container, link, region, stockLocation, logger);
  await ensurePublishableKeys(container, query, salesChannel, logger);
  await ensureProductSalesChannelAndPrices(
    container,
    query,
    salesChannel,
    logger,
  );
  await ensureInventoryLevels(container, query, stockLocation, logger);

  logger.info("Finished setting up UAE region.");
}
