import LocalizedClientLink from "@modules/common/components/localized-client-link"

const pexelsImage = (id: string, width = 1400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`

const shopCategories = [
  {
    name: "Latina",
    href: "/categories/latina",
    image: pexelsImage("30662687", 900),
    description: "Satin, sparkle, and flexible soles for rhythm work.",
  },
  {
    name: "Standard",
    href: "/categories/standard",
    image: pexelsImage("18812920", 900),
    description: "Balanced courts and smooth heel profiles for ballroom.",
  },
  {
    name: "Training Shoes",
    href: "/categories/training-shoes",
    image: pexelsImage("5149592", 900),
    description: "Supportive practice pairs for daily studio hours.",
  },
  {
    name: "Training Clothes",
    href: "/categories/training-clothes",
    image: pexelsImage("6453626", 900),
    description: "Layerable pieces that move cleanly through drills.",
  },
  {
    name: "Accessories",
    href: "/categories/accessories",
    image: pexelsImage("5051136", 900),
    description: "Heel protectors, brushes, bags, and care essentials.",
  },
]

const featuredProducts = [
  {
    name: "Aura Latina Sandal",
    category: "Latina",
    price: "$148",
    image: pexelsImage("30662687", 900),
    badge: "New",
    detail: "2.5 inch flared heel",
  },
  {
    name: "Vienna Standard Court",
    category: "Standard",
    price: "$164",
    image: pexelsImage("3423875", 900),
    badge: "Best fit",
    detail: "Closed toe, suede sole",
  },
  {
    name: "Pivot Practice Trainer",
    category: "Training Shoes",
    price: "$118",
    image: pexelsImage("5149592", 900),
    badge: "Studio",
    detail: "Split sole support",
  },
  {
    name: "Motion Warm-Up Set",
    category: "Training Clothes",
    price: "$96",
    image: pexelsImage("6454164", 900),
    badge: "Core",
    detail: "Soft stretch layers",
  },
]

const fitNotes = [
  "Half sizes across competition heels",
  "Brush-friendly suede sole options",
  "Heel protectors matched by diameter",
  "Studio pickup and easy exchanges",
]

export default function DanceShopMockup() {
  return (
    <div className="bg-white text-ui-fg-base">
      <section className="relative h-[calc(100svh-6rem)] overflow-hidden bg-grey-90 text-white small:h-[calc(100svh-8rem)]">
        <img
          src={pexelsImage("2057274", 2200)}
          alt="Ballroom dancers moving across a competition floor"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-grey-90 via-grey-90/35 to-grey-90/5" />

        <div className="content-container relative z-10 flex h-full flex-col justify-end pb-8 small:pb-12">
          <div className="max-w-3xl">
            <p className="mb-4 text-small-semi uppercase text-white/80">
              Competition shoes and studio essentials
            </p>
            <h1 className="text-[44px] font-normal leading-[48px] small:text-[68px] small:leading-[72px]">
              Vuelta Dance Shoes
            </h1>
            <p className="mt-5 max-w-xl text-base-regular text-white/85 small:text-large-regular">
              A refined shop concept for Latina, Standard, training shoes,
              practice wear, and dance accessories.
            </p>
            <div className="mt-8 flex flex-col gap-3 xsmall:flex-row">
              <LocalizedClientLink
                href="/store"
                className="inline-flex min-h-12 items-center justify-center rounded-base bg-white px-6 py-3 text-small-semi uppercase text-grey-90 transition hover:bg-grey-10"
              >
                Shop new arrivals
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/categories/latina"
                className="inline-flex min-h-12 items-center justify-center rounded-base border border-white px-6 py-3 text-small-semi uppercase text-white transition hover:bg-white hover:text-grey-90"
              >
                Explore Latina
              </LocalizedClientLink>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 border-t border-white/30 pt-5 text-small-regular text-white/80 small:grid-cols-5">
            {shopCategories.map((category) => (
              <LocalizedClientLink
                key={category.name}
                href={category.href}
                className="transition hover:text-white"
              >
                {category.name}
              </LocalizedClientLink>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ui-border-base bg-white py-12 small:py-16">
        <div className="content-container">
          <div className="mb-8 flex flex-col justify-between gap-4 small:flex-row small:items-end">
            <div>
              <p className="mb-2 text-small-semi uppercase text-ui-fg-muted">
                Browse by discipline
              </p>
              <h2 className="text-2xl-regular text-ui-fg-base">
                Built around how dancers shop
              </h2>
            </div>
            <LocalizedClientLink
              href="/store"
              className="text-small-semi uppercase text-ui-fg-subtle transition hover:text-ui-fg-base"
            >
              View all categories
            </LocalizedClientLink>
          </div>

          <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2 small:grid-cols-5">
            {shopCategories.map((category) => (
              <article
                key={category.name}
                className="group overflow-hidden rounded-base border border-ui-border-base bg-white"
              >
                <LocalizedClientLink href={category.href} className="block">
                  <div className="aspect-[4/5] overflow-hidden bg-ui-bg-subtle">
                    <img
                      src={category.image}
                      alt={`${category.name} dance category`}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="min-h-[136px] p-4">
                    <h3 className="text-large-semi text-ui-fg-base">
                      {category.name}
                    </h3>
                    <p className="mt-2 text-small-regular text-ui-fg-subtle">
                      {category.description}
                    </p>
                  </div>
                </LocalizedClientLink>
              </article>
            ))}
          </div>
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
                Competition polish, practice comfort
              </h2>
            </div>
            <LocalizedClientLink
              href="/store"
              className="text-small-semi uppercase text-ui-fg-subtle transition hover:text-ui-fg-base"
            >
              Shop the edit
            </LocalizedClientLink>
          </div>

          <div className="grid grid-cols-1 gap-5 xsmall:grid-cols-2 small:grid-cols-4">
            {featuredProducts.map((product) => (
              <article
                key={product.name}
                className="overflow-hidden rounded-base border border-ui-border-base bg-white"
              >
                <div className="relative aspect-[4/5] bg-ui-bg-subtle">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute left-3 top-3 rounded-base bg-white px-3 py-1 text-xsmall-regular uppercase text-ui-fg-base">
                    {product.badge}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xsmall-regular uppercase text-ui-fg-muted">
                        {product.category}
                      </p>
                      <h3 className="mt-1 text-base-semi text-ui-fg-base">
                        {product.name}
                      </h3>
                    </div>
                    <p className="text-base-semi text-ui-fg-base">
                      {product.price}
                    </p>
                  </div>
                  <p className="mt-3 text-small-regular text-ui-fg-subtle">
                    {product.detail}
                  </p>
                  <LocalizedClientLink
                    href="/store"
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-base border border-grey-90 px-4 py-2 text-small-semi uppercase text-grey-90 transition hover:bg-grey-90 hover:text-white"
                  >
                    View styles
                  </LocalizedClientLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-12 small:py-20">
        <div className="content-container grid grid-cols-1 gap-8 small:grid-cols-[1.15fr_0.85fr] small:items-stretch">
          <div className="overflow-hidden rounded-base bg-ui-bg-subtle">
            <img
              src={pexelsImage("14074745", 1600)}
              alt="Dance partners rehearsing in a studio"
              className="h-full min-h-[420px] w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="flex flex-col justify-center border-y border-ui-border-base py-10 small:py-0">
            <p className="mb-3 text-small-semi uppercase text-ui-fg-muted">
              Fit room concept
            </p>
            <h2 className="text-2xl-regular text-ui-fg-base">
              Guide shoppers by dance style, heel, and studio routine.
            </h2>
            <p className="mt-5 text-base-regular text-ui-fg-subtle">
              The mockup pairs editorial imagery with practical buying cues:
              sole type, heel height, training frequency, and accessories that
              naturally belong with each shoe.
            </p>

            <ul className="mt-8 grid grid-cols-1 gap-3 xsmall:grid-cols-2">
              {fitNotes.map((note) => (
                <li
                  key={note}
                  className="rounded-base border border-ui-border-base bg-white px-4 py-3 text-small-regular text-ui-fg-subtle"
                >
                  {note}
                </li>
              ))}
            </ul>

            <LocalizedClientLink
              href="/store"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-base bg-grey-90 px-6 py-3 text-small-semi uppercase text-white transition hover:bg-grey-80 xsmall:w-fit"
            >
              Open fit guide
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      <section className="border-y border-ui-border-base bg-grey-90 py-10 text-white">
        <div className="content-container grid grid-cols-1 gap-6 small:grid-cols-4">
          {fitNotes.map((note) => (
            <div key={note}>
              <p className="text-base-semi">{note}</p>
              <p className="mt-2 text-small-regular text-white/65">
                Clear product details for dancers comparing feel, support, and
                stage readiness.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
