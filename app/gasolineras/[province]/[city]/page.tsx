import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedRouteLink } from "@/components/tracked-route-link";
import {
  buildCityCopy,
  displayAddress,
  displayBrand,
  formatEuros,
  formatPrice,
  getCityInsights,
  getCityStations,
} from "@/lib/city-insights";
import {
  INDEXED_SEO_LOCATIONS,
  getIndexedSeoLocation,
  getSeoLocationPath,
  getSeoProvince,
  getSeoProvincePath,
} from "@/lib/seo-locations";
import { getFallbackUpdatedAt } from "@/lib/stations";

export const dynamicParams = false;

type Props = { params: Promise<{ province: string; city: string }> };

const SITE = "https://www.gasolinago.com";

export function generateStaticParams() {
  return INDEXED_SEO_LOCATIONS.map((location) => ({
    province: location.provinceSlug,
    city: location.citySlug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { province, city } = await params;
  const location = getIndexedSeoLocation(province, city);
  if (!location) return {};
  const stations = getCityStations(location);
  const g95 = stations.map((station) => station.g95).filter((price): price is number => price !== null);
  const cheapest = g95.length ? Math.min(...g95) : null;
  const title = cheapest
    ? `Gasolina barata en ${location.displayName} hoy: desde ${cheapest.toFixed(3).replace(".", ",")} €/L`
    : `Gasolineras más baratas en ${location.displayName} hoy`;
  const description = `Compara el precio oficial de gasolina y diésel en las ${stations.length} gasolineras de ${location.displayName}: la más barata de hoy, la media de la ciudad, su evolución y las abiertas 24 horas.`;
  const url = getSeoLocationPath(location);
  return {
    title: { absolute: `${title} | GasolinaGo` },
    description,
    alternates: { canonical: url },
    robots: location.indexable ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: "website", locale: "es_ES" },
  };
}

export default async function CityPage({ params }: Props) {
  const { province, city } = await params;
  const location = getIndexedSeoLocation(province, city);
  if (!location) notFound();

  const insights = await getCityInsights(location);
  const provinceInfo = getSeoProvince(location.provinceSlug);
  const provinceName = provinceInfo?.displayName ?? location.province;
  const { paragraphs, faqs } = buildCityCopy(location.displayName, provinceName, insights);
  const { fuels, stations } = insights;
  const primary = fuels[0];
  const nearbyKeys = new Set(insights.nearby.map((item) => `${item.provinceSlug}/${item.citySlug}`));
  const relatedLocations = provinceInfo?.locations
    .filter((candidate) => candidate.citySlug !== location.citySlug && !nearbyKeys.has(`${candidate.provinceSlug}/${candidate.citySlug}`))
    .filter((candidate) => candidate.indexable)
    .slice(0, 8) ?? [];
  const radarUrl = `/?ciudad=${encodeURIComponent(location.city)}&provincia=${encodeURIComponent(location.province)}`;
  const pageUrl = `${SITE}${getSeoLocationPath(location)}`;
  const updatedAt = getFallbackUpdatedAt();
  const today = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${updatedAt}T12:00:00Z`));
  const itemList = primary?.ranked.slice(0, 8) ?? [];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "GasolinaGo", item: SITE },
          { "@type": "ListItem", position: 2, name: "Gasolineras", item: `${SITE}/gasolineras` },
          { "@type": "ListItem", position: 3, name: provinceName, item: provinceInfo ? `${SITE}${getSeoProvincePath(provinceInfo)}` : pageUrl },
          { "@type": "ListItem", position: 4, name: location.displayName, item: pageUrl },
        ],
      },
      {
        "@type": "ItemList",
        name: `Gasolineras más baratas en ${location.displayName}`,
        numberOfItems: itemList.length,
        itemListElement: itemList.map((station, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "GasStation",
            name: displayBrand(station.brand),
            brand: { "@type": "Brand", name: displayBrand(station.brand) },
            address: {
              "@type": "PostalAddress",
              streetAddress: displayAddress(station.address),
              addressLocality: location.displayName,
              addressRegion: provinceName,
              addressCountry: "ES",
            },
            geo: { "@type": "GeoCoordinates", latitude: station.lat, longitude: station.lng },
          },
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <main className="city-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="city-topbar">
        <Link href="/" className="brand" aria-label="GasolinaGo, inicio">
          <span className="brand-mark">G</span>
          <span>Gasolina<strong>Go</strong></span>
        </Link>
        <nav className="city-nav" aria-label="Navegación principal"><Link href="/observatorio">Datos</Link><Link href="/blog">Blog</Link><Link href="/gasolineras">Todas las provincias</Link></nav>
      </header>

      <nav className="breadcrumbs" aria-label="Migas de pan">
        <Link href="/">Inicio</Link><span>/</span><Link href="/gasolineras">Gasolineras</Link><span>/</span>{provinceInfo ? <><Link href={getSeoProvincePath(provinceInfo)}>{provinceInfo.displayName}</Link><span>/</span></> : null}<strong>{location.displayName}</strong>
      </nav>

      <section className="city-hero city-hero-detail">
        <div>
          <p className="eyebrow">Precios oficiales · {today}</p>
          <h1>Gasolineras más baratas<br />en <em>{location.displayName}.</em></h1>
        </div>
        <p>{paragraphs[0] ?? `Compara los precios oficiales de las gasolineras de ${location.displayName} y abre la ruta hacia la estación elegida.`}</p>
      </section>

      {primary ? (
        <section className="city-summary" aria-label="Resumen de precios">
          <div><span>Estaciones con precio</span><strong>{primary.ranked.length}</strong></div>
          <div><span>{primary.label} más barata</span><strong>{formatPrice(primary.cheapestPrice)}</strong></div>
          <div><span>Media de la ciudad</span><strong>{formatPrice(primary.average)}</strong></div>
          <div><span>Ahorro en 50 litros</span><strong>{formatEuros(primary.saving)}</strong></div>
        </section>
      ) : (
        <p className="city-notice">Los precios de esta ciudad no están disponibles temporalmente. Puedes volver a intentarlo desde el radar general.</p>
      )}

      {fuels.map((summary) => (
        <section className="city-ranking" key={summary.fuel}>
          <div className="city-section-title">
            <div>
              <p className="eyebrow">Ranking de hoy</p>
              <h2>{summary.label} barata en {location.displayName}</h2>
            </div>
            <span>Media: {formatPrice(summary.average)}</span>
          </div>
          <div className="city-station-list">
            {summary.ranked.slice(0, 8).map((station, index) => (
              <article className="city-station" key={`${summary.fuel}-${station.id}`}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{displayBrand(station.brand)}</h3>
                  <p>{displayAddress(station.address)}</p>
                  <small>{station.schedule}</small>
                </div>
                <strong>{formatPrice(station[summary.fuel] as number)}</strong>
                <TrackedRouteLink station={station} fuel={summary.fuel} />
              </article>
            ))}
          </div>
        </section>
      ))}

      {paragraphs.length > 1 ? (
        <section className="city-explainer">
          <div>
            <p className="eyebrow">Análisis de precios</p>
            <h2>Así está el precio de la gasolina en {location.displayName}.</h2>
          </div>
          <div>
            {paragraphs.slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p>
              Esta página se actualiza cada día con los precios que las estaciones comunican al Ministerio para la Transición Ecológica. En el <Link href={radarUrl}>radar</Link> ves los precios del momento.
            </p>
          </div>
        </section>
      ) : null}

      <section className="city-faq" aria-labelledby="faq-title">
        <p className="eyebrow">Preguntas frecuentes</p>
        <h2 id="faq-title">Repostar en {location.displayName}.</h2>
        <div>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="city-cta">
        <div><p className="eyebrow">Vista interactiva</p><h2>Explora {location.displayName} en el radar.</h2></div>
        <Link href={radarUrl}>Abrir mapa y filtros <span aria-hidden="true">→</span></Link>
      </section>

      {insights.nearby.length ? (
        <section className="city-related" aria-labelledby="nearby-title">
          <p className="eyebrow">A menos de una hora</p>
          <h2 id="nearby-title">Gasolineras cerca de {location.displayName}.</h2>
          <div>
            {insights.nearby.map((related) => (
              <Link href={getSeoLocationPath(related)} key={`${related.provinceSlug}-${related.citySlug}`}>
                {related.displayName}<span>{Math.round(related.distance)} km · {related.stationCount} estaciones →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {relatedLocations.length ? (
        <section className="city-related" aria-labelledby="province-title">
          <p className="eyebrow">También en {provinceName}</p>
          <h2 id="province-title">Otros municipios de la provincia.</h2>
          <div>
            {relatedLocations.map((related) => (
              <Link href={getSeoLocationPath(related)} key={related.citySlug}>
                {related.displayName}<span>{related.stationCount} estaciones →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="city-footer">
        <span>Fuente: Ministerio para la Transición Ecológica · {stations.length} estaciones · Actualizado el {today}</span>
        <Link href="/privacidad">Privacidad</Link>
      </footer>
    </main>
  );
}
