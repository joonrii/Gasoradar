import type { Metadata } from "next";
import { RadarApp } from "@/components/radar-app";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type Props = {
  searchParams: Promise<{ ciudad?: string | string[]; provincia?: string | string[] }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const city = typeof params.ciudad === "string" ? params.ciudad : null;
  const province = typeof params.provincia === "string" ? params.provincia : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.gasolinago.com/#website",
        name: "GasolinaGo",
        alternateName: ["Gasolina Go", "gasolinago.com"],
        url: "https://www.gasolinago.com/",
        publisher: { "@id": "https://www.gasolinago.com/#organization" },
        inLanguage: "es-ES",
      },
      {
        "@type": "Organization",
        "@id": "https://www.gasolinago.com/#organization",
        name: "GasolinaGo",
        alternateName: "Gasolina Go",
        url: "https://www.gasolinago.com/",
        logo: "https://www.gasolinago.com/icon.svg",
      },
      {
        "@type": "WebApplication",
        name: "GasolinaGo",
        url: "https://www.gasolinago.com/",
        applicationCategory: "TravelApplication",
        operatingSystem: "Cualquier navegador",
        description: "Comparador gratuito de precios oficiales de gasolina y diésel en España.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        featureList: [
          "Comparar precios de carburante",
          "Buscar gasolineras por ciudad",
          "Ordenar estaciones por distancia",
          "Abrir rutas en Google Maps",
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <RadarApp initialCity={city && province ? { city, province } : null} />
    </>
  );
}
