import type { Metadata } from "next";
import { RadarApp } from "@/components/radar-app";
import { Ambient, SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Gasolineras baratas cerca de mí",
  description: "Encuentra la gasolinera más barata cerca de tu ubicación, compara precios oficiales de gasolina y diésel y abre la ruta para llegar.",
  alternates: { canonical: "/cerca" },
};

type Props = {
  searchParams: Promise<{ ciudad?: string | string[]; provincia?: string | string[] }>;
};

export default async function NearbyPage({ searchParams }: Props) {
  const params = await searchParams;
  const city = typeof params.ciudad === "string" ? params.ciudad : null;
  const province = typeof params.provincia === "string" ? params.provincia : null;
  return (
    <>
      <Ambient />
      <SiteHeader current="/cerca" />
      <RadarApp initialCity={city && province ? { city, province } : null} />
      <SiteFooter />
    </>
  );
}
