import { RadarApp } from "@/components/radar-app";

type Props = {
  searchParams: Promise<{ ciudad?: string | string[]; provincia?: string | string[] }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const city = typeof params.ciudad === "string" ? params.ciudad : null;
  const province = typeof params.provincia === "string" ? params.provincia : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GasolinaGo",
    url: "https://www.gasolinago.com",
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
