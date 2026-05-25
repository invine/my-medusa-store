import { Metadata } from "next"

import DanceShopMockup from "@modules/home/templates/dance-shop-mockup"

export const metadata: Metadata = {
  title: "Vuelta Dance Shoes",
  description:
    "A dance shoes storefront mockup for Latina, Standard, training shoes, training clothes, and accessories.",
}

export default async function Home() {
  return <DanceShopMockup />
}
