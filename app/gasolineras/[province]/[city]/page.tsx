import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartCard, LegendItem } from "@/components/charts/chart-card";
import { dayLabel, fmtPrice, signedCents } from "@/components/charts/chart-utils";
import { DotRanking, MultiLineChart, PriceStrip } from "@/components/charts/charts";
import { StatTile } from "@/components/charts/sparkline";
import { Ambient, SiteFooter, SiteHeader } from "@/components/site-header";
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
import { getNationalSeries, getProvinceSeries } from "@/lib/market";
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
  const g95Stats = fuels.find((fuel) => fuel.fuel === "g95");
  const nearbyKeys = new Set(insights.nearby.map((item) => `${item.provinceSlug}/${item.citySlug}`));
  const relatedLocations = provinceInfo?.locations
    .filter((candidate) => candidate.citySlug !== location.citySlug && !nearbyKeys.has(`${candidate.provinceSlug}/${candidate.citySlug}`))
    .filter((candidate) => candidate.indexable)
    .slice(0, 8) ?? [];
  const radarUrl = `/cerca?ciudad=${encodeURIComponent(location.city)}&provincia=${encodeURIComponent(location.province)}`;
  const pageUrl = `${SITE}${getSeoLocationPath(location)}`;
  const today = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${getFallbackUpdatedAt()}T12:00:00Z`));

  // Serie de la ciudad frente a su provincia y a España, alineadas por fecha
  const { dates } = insights.daily;
  const national = getNationalSeries();
  const nationalByDate = new Map(national.dates.map((date, i) => [date, national.values.g95[i]]));
  const provinceSeries = getProvinceSeries(location.province, dates).g95;
  const spainSeries = dates.map((date) => nationalByDate.get(date) ?? null);
  const hasTrend = insights.daily.g95.filter((value) => value !== null).length >= 7;
  const provinceToday = insights.provinceAverage.g95;
  const open24 = insights.open24h.length;
  const brandRows = (() => {
    const groups = new Map<string, number[]>();
    for (const station of g95Stats?.ranked ?? []) {
      const name = displayBrand(station.brand);
      groups.set(name, [...(groups.get(name) ?? []), station.g95 as number]);
    }
    return [...groups]
      .filter(([, prices]) => prices.length >= 2)
      .map(([label, prices]) => ({ label, value: prices.reduce((a, b) => a + b, 0) / prices.length, note: `${prices.length} estaciones` }))
      .sort((a, b) => a.value - b.value);
  })();

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
    <>
      <Ambient />
      <SiteHeader current="/gasolineras" />
      <main className="gg-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

        <nav className="gg-crumbs" aria-label="Migas de pan">
          <Link href="/">Inicio</Link><span>/</span><Link href="/gasolineras">Gasolineras</Link><span>/</span>
          {provinceInfo ? <><Link href={getSeoProvincePath(provinceInfo)}>{provinceInfo.displayName}</Link><span>/</span></> : null}
          <b>{location.displayName}</b>
        </nav>

        <section className="city-head">
          <p className="eyebrow">Precios oficiales · {today}</p>
          <h1>Gasolina barata en {location.displayName} hoy</h1>
          <p>{[paragraphs[0], paragraphs[1]].filter(Boolean).join(" ") || `Compara los precios oficiales de las gasolineras de ${location.displayName} y abre la ruta hacia la estación elegida.`}</p>
        </section>

        {primary ? (
          <section className="stat-tiles" aria-label={`Resumen de ${location.displayName}`}>
            <StatTile label={`${primary.label} más barata hoy`} value={fmtPrice(primary.cheapestPrice)} unit="€/L" delta={displayBrand(primary.ranked[0].brand)} />
            <StatTile
              label={`Media de ${location.displayName}`}
              value={fmtPrice(primary.average)}
              unit="€/L"
              delta={insights.trend ? `${insights.trend.change <= 0 ? "↓" : "↑"} ${fmtPrice(Math.abs(insights.trend.change) * 100, 1)} cént. desde el ${dayLabel(insights.trend.from)}` : undefined}
              deltaTone={insights.trend ? (insights.trend.change <= 0 ? "good" : "bad") : undefined}
              spark={hasTrend ? insights.daily.g95 : undefined}
              sparkColor="var(--s1)"
            />
            {provinceToday !== undefined && g95Stats ? (
              <StatTile label={`Frente a ${provinceName}`} value={signedCents(g95Stats.average - provinceToday).replace(" cént.", "")} unit="cént." delta={g95Stats.average < provinceToday ? "Más barata que la provincia" : "Más cara que la provincia"} deltaTone={g95Stats.average < provinceToday ? "good" : "bad"} />
            ) : null}
            <StatTile label="Abiertas 24 horas" value={String(open24)} unit={`de ${stations.length}`} delta="Para repostar de noche" />
          </section>
        ) : (
          <p className="gg-note">Los precios de esta ciudad no están disponibles temporalmente. Puedes volver a intentarlo desde <Link href="/cerca">Cerca de mí</Link>.</p>
        )}

        {hasTrend ? (
          <ChartCard
            title={`Gasolina 95 en ${location.displayName} frente a ${provinceName} y España`}
            subtitle="Precio medio diario en los últimos 30 días, en €/L."
            legend={<><LegendItem color="var(--s1)" label={location.displayName} /><LegendItem color="var(--s2)" label={`Provincia de ${provinceName}`} /><LegendItem color="var(--s3)" label="España (península y Baleares)" /></>}
            table={{ head: ["Día", location.displayName, provinceName, "España"], rows: dates.map((date, i) => [dayLabel(date), insights.daily.g95[i] !== null ? fmtPrice(insights.daily.g95[i] as number) : "—", provinceSeries[i] !== null ? fmtPrice(provinceSeries[i] as number) : "—", spainSeries[i] !== null ? fmtPrice(spainSeries[i] as number) : "—"]).reverse() }}
          >
            <MultiLineChart dates={dates} series={[
              { name: location.displayName, color: "var(--s1)", values: insights.daily.g95 },
              { name: provinceName, color: "var(--s2)", values: provinceSeries },
              { name: "España", color: "var(--s3)", values: spainSeries },
            ]} />
          </ChartCard>
        ) : null}

        {g95Stats && g95Stats.ranked.length >= 3 ? (
          <div className="gg-grid-2">
            <ChartCard
              title="Cómo se reparten los precios"
              subtitle={`Cada punto es una gasolinera de ${location.displayName}. Cuanto más a la izquierda, más barata.`}
              table={{ head: ["Gasolinera", "Dirección", "Gasolina 95"], rows: g95Stats.ranked.map((s) => [displayBrand(s.brand), displayAddress(s.address), fmtPrice(s.g95 as number)]) }}
            >
              <PriceStrip items={g95Stats.ranked.map((s) => ({ price: s.g95 as number, label: displayBrand(s.brand), sub: displayAddress(s.address) }))} average={g95Stats.average} />
            </ChartCard>
            {brandRows.length >= 2 ? (
              <ChartCard
                title={`Marcas en ${location.displayName}`}
                subtitle="Gasolina 95, media por marca (2 o más estaciones)."
                table={{ head: ["Marca", "Gasolina 95", "Estaciones"], rows: brandRows.map((b) => [b.label, fmtPrice(b.value), b.note]) }}
              >
                <DotRanking rows={brandRows} />
              </ChartCard>
            ) : (
              <section className="gg-card chart-card">
                <header className="chart-card-head"><div><h3>Lo que te ahorras</h3><p>Llenando 50 litros en la más barata frente a la más cara.</p></div></header>
                <div className="big-figure">{formatEuros((g95Stats.maxPrice - g95Stats.cheapestPrice) * 50)}</div>
              </section>
            )}
          </div>
        ) : null}

        {fuels.map((summary) => (
          <section className="gg-card chart-card" key={summary.fuel}>
            <header className="chart-card-head"><div><h3>{summary.label}: las más baratas de {location.displayName}</h3><p>Media de la ciudad: {formatPrice(summary.average)}. Toca &quot;Abrir ruta&quot; para ir.</p></div></header>
            <ol className="station-ranking">
              {summary.ranked.slice(0, 8).map((station, index) => (
                <li key={`${summary.fuel}-${station.id}`}>
                  <span className="n">{index + 1}</span>
                  <span className="name"><b>{displayBrand(station.brand)}</b><small>{displayAddress(station.address)} · {station.schedule}</small></span>
                  <span className="v">{fmtPrice(station[summary.fuel] as number)}</span>
                  <TrackedRouteLink station={station} fuel={summary.fuel} />
                </li>
              ))}
            </ol>
          </section>
        ))}

        {paragraphs.length > 2 ? (
          <section className="gg-card prose-card">
            <p className="eyebrow">Análisis de precios</p>
            <h2>Así está el precio de la gasolina en {location.displayName}</h2>
            {paragraphs.slice(2).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p>Esta página se actualiza cada día con los precios que las estaciones comunican al Ministerio para la Transición Ecológica. En <Link href={radarUrl}>Cerca de mí</Link> ves los precios del momento.</p>
          </section>
        ) : null}

        <section className="band-cta gg-glass">
          <div><h2>¿Cuál te conviene a ti?</h2><p>Teniendo en cuenta dónde estás, si está abierta y lo que cuesta llegar.</p></div>
          <Link className="gg-cta" href={radarUrl}>Ver cerca de mí <span aria-hidden="true">→</span></Link>
        </section>

        <section className="gg-faq" aria-labelledby="faq-title">
          <p className="eyebrow">Preguntas frecuentes</p>
          <h2 id="faq-title">Repostar en {location.displayName}</h2>
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </section>

        {insights.nearby.length || relatedLocations.length ? (
          <section className="gg-links">
            {insights.nearby.length ? (
              <div>
                <h2>Gasolineras cerca de {location.displayName}</h2>
                <div className="link-grid">
                  {insights.nearby.map((related) => (
                    <Link href={getSeoLocationPath(related)} key={`${related.provinceSlug}-${related.citySlug}`}>{related.displayName}<span>{Math.round(related.distance)} km</span></Link>
                  ))}
                </div>
              </div>
            ) : null}
            {relatedLocations.length ? (
              <div>
                <h2>Otros municipios de {provinceName}</h2>
                <div className="link-grid">
                  {relatedLocations.map((related) => (
                    <Link href={getSeoLocationPath(related)} key={related.citySlug}>{related.displayName}<span>{related.stationCount} estaciones</span></Link>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <p className="gg-note">Fuente: Ministerio para la Transición Ecológica · {stations.length} estaciones · Actualizado el {today}</p>
      </main>
      <SiteFooter />
    </>
  );
}
