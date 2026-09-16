import type { Metadata } from "next";
import Link from "next/link";
import { SEO_LOCATIONS, getSeoLocationPath } from "@/lib/locations";

export const metadata: Metadata = {
  title: "Gasolineras baratas por ciudad",
  description:
    "Consulta las gasolineras más baratas y los precios actuales de gasolina y diésel en las principales ciudades de España.",
  alternates: { canonical: "/gasolineras" },
  openGraph: {
    title: "Gasolineras baratas por ciudad",
    description: "Compara precios oficiales de carburante en las principales ciudades de España.",
    url: "/gasolineras",
    type: "website",
    locale: "es_ES",
  },
};

export default function CityDirectoryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Gasolineras baratas por ciudad",
    url: "https://www.gasolinago.com/gasolineras",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: SEO_LOCATIONS.map((location, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `Gasolineras baratas en ${location.displayName}`,
        url: `https://www.gasolinago.com${getSeoLocationPath(location)}`,
      })),
    },
  };

  return (
    <main className="city-shell directory-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="city-topbar">
        <Link href="/" className="brand" aria-label="GasolinaGo, inicio">
          <span className="brand-mark">G</span>
          <span>Gasolina<strong>Go</strong></span>
        </Link>
        <Link href="/">Abrir el radar</Link>
      </header>

      <section className="city-hero">
        <p className="eyebrow">Precios locales · España</p>
        <h1>Gasolineras baratas<br /><em>por ciudad.</em></h1>
        <p>
          Elige una ciudad para comparar precios oficiales, ver cuánto puedes ahorrar y abrir la ruta hacia la estación que te convenga.
        </p>
      </section>

      <section className="city-directory" aria-label="Ciudades disponibles">
        {SEO_LOCATIONS.map((location) => (
          <Link href={getSeoLocationPath(location)} key={`${location.provinceSlug}-${location.citySlug}`}>
            <span>{location.displayName}</span>
            <small>{location.province}</small>
            <b aria-hidden="true">→</b>
          </Link>
        ))}
      </section>

      <section className="city-method">
        <p className="eyebrow">Cómo funciona</p>
        <h2>Datos oficiales, una decisión sencilla.</h2>
        <p>
          Los precios proceden del Ministerio para la Transición Ecológica. GasolinaGo los normaliza y ordena para que puedas comparar estaciones sin registro ni publicidad invasiva.
        </p>
      </section>
    </main>
  );
}
