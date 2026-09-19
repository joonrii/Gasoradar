import type { Metadata } from "next";
import Link from "next/link";
import {
  SEO_PROVINCES,
  getSeoLocationPath,
  getSeoProvincePath,
} from "@/lib/seo-locations";

export const metadata: Metadata = {
  title: "Gasolineras baratas por provincia y ciudad",
  description:
    "Consulta las gasolineras más baratas y los precios actuales de gasolina y diésel por provincia y municipio en toda España.",
  alternates: { canonical: "/gasolineras" },
  openGraph: {
    title: "Gasolineras baratas por provincia y ciudad",
    description: "Compara precios oficiales de carburante por provincia y municipio en toda España.",
    url: "/gasolineras",
    type: "website",
    locale: "es_ES",
  },
};

export default function CityDirectoryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Gasolineras baratas por provincia y ciudad",
    url: "https://www.gasolinago.com/gasolineras",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: SEO_PROVINCES.map((province, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `Gasolineras baratas en ${province.displayName}`,
        url: `https://www.gasolinago.com${getSeoProvincePath(province)}`,
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
        <nav className="city-nav" aria-label="Navegación principal"><Link href="/observatorio">Datos</Link><Link href="/blog">Blog</Link><Link href="/">Abrir el radar</Link></nav>
      </header>

      <section className="city-hero">
        <p className="eyebrow">Precios locales · España</p>
        <h1>Gasolineras baratas<br /><em>por territorio.</em></h1>
        <p>
          Elige una provincia y después tu municipio para comparar precios oficiales y encontrar la estación que más te conviene.
        </p>
      </section>

      <section className="province-directory" aria-label="Provincias disponibles">
        {SEO_PROVINCES.map((province) => (
          <article key={province.slug}>
            <Link className="province-heading" href={getSeoProvincePath(province)}>
              <span><strong>{province.displayName}</strong><small>{province.stationCount} estaciones</small></span>
              <b aria-hidden="true">→</b>
            </Link>
            {province.locations.length ? (
              <div className="province-city-links">
                {province.locations.slice(0, 5).map((location) => (
                  <Link href={getSeoLocationPath(location)} key={location.citySlug}>
                    {location.displayName}<span>{location.stationCount}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </article>
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
