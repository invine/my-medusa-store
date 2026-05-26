import { Metadata } from "next"

import DanceShopMockup from "@modules/home/templates/dance-shop-mockup"

export const metadata: Metadata = {
  title: "Store",
  description: "Browse products, categories, and collections.",
}

type Params = {
  params: Promise<{
    countryCode: string
  }>
}

export default async function Home(props: Params) {
  const params = await props.params

  return <DanceShopMockup countryCode={params.countryCode} />
}
