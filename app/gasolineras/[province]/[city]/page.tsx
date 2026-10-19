import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartCard, LegendItem } from "@/components/charts/chart-card";
import { CityMap } from "@/components/city-map";
import { dayLabel, fmtPrice } from "@/components/charts/chart-utils";
import { DotRanking, MultiLineChart, PriceStrip } from "@/components/charts/charts";
import { Ambient, SiteFooter, SiteHeader } from "@/components/site-header";
import { Totem } from "@/components/totem";
import {
  buildCityCopy,
  displayAddress,
  displayBrand,
  formatEuros,
  getCityInsights,
  AREA_RADIUS_KM,
  getAreaStations,
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
  const sameName = provinceName.localeCompare(location.displayName, "es", { sensitivity: "base" }) === 0;
  const provinceLabel = sameName ? `la provincia de ${provinceName}` : provinceName;
  const { paragraphs, faqs } = buildCityCopy(location.displayName, provinceLabel, insights);
  const { fuels, stations } = insights;
  const primary = fuels[0];
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
  // Mapa, tótem, reparto de precios y marcas usan la ciudad y sus alrededores
  const areaStations = getAreaStations(location);
  const hasSurroundings = areaStations.length > stations.length;
  const areaLabel = hasSurroundings ? `${location.displayName} y alrededores` : location.displayName;
  const areaG95 = areaStations.filter((station) => station.g95 !== null).sort((a, b) => (a.g95 as number) - (b.g95 as number));
  const areaG95Average = areaG95.length ? areaG95.reduce((sum, station) => sum + (station.g95 as number), 0) / areaG95.length : 0;
  // ¿Compensa salir del municipio? Solo se dice si ahorra al menos 1 céntimo por litro.
  const cityBest = areaG95.find((station) => station.inCity);
  const areaBest = areaG95[0];
  const outsideTip = cityBest && areaBest && !areaBest.inCity && (cityBest.g95 as number) - (areaBest.g95 as number) >= 0.01
    ? `Si sales de ${location.displayName}, a menos de ${AREA_RADIUS_KM} km hay ${areaG95.length} gasolineras con gasolina 95. La más barata, ${displayBrand(areaBest.brand)} en ${areaBest.town} (a ${String(areaBest.distance).replace(".", ",")} km), está a ${fmtPrice(areaBest.g95 as number)} €/L: ${formatEuros(((cityBest.g95 as number) - (areaBest.g95 as number)) * 50)} menos por depósito de 50 litros que la más barata de ${location.displayName}.`
    : null;
  const allFaqs = outsideTip ? [...faqs.slice(0, 1), { question: `¿Hay gasolineras más baratas cerca de ${location.displayName}?`, answer: outsideTip }, ...faqs.slice(1)] : faqs;
  const placeOf = (station: (typeof areaG95)[number]) => (station.inCity ? displayAddress(station.address) : `${displayAddress(station.address)}, ${station.town}`);
  const brandRows = (() => {
    const groups = new Map<string, number[]>();
    for (const station of areaG95) {
      const name = displayBrand(station.brand);
      groups.set(name, [...(groups.get(name) ?? []), station.g95 as number]);
    }
    return [...groups]
      .filter(([, prices]) => prices.length >= 2)
      .map(([label, prices]) => ({ label, value: prices.reduce((a, b) => a + b, 0) / prices.length, note: `${prices.length} estaciones` }))
      .sort((a, b) => a.value - b.value);
  })();

  // El tótem usa la ciudad y sus alrededores, igual que el mapa de encima
  const fuelTotem = (["g95", "g98", "diesel", "dieselPlus"] as const).flatMap((fuel) => {
    const best = areaStations.filter((station) => station[fuel] !== null).sort((a, b) => (a[fuel] as number) - (b[fuel] as number))[0];
    if (!best) return [];
    return [{ fuel, price: best[fuel] as number, note: best.inCity ? `En ${location.displayName}` : `En ${best.town}, a ${String(best.distance).replace(".", ",")} km` }];
  });
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
        mainEntity: allFaqs.map((faq) => ({
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
          <p>{paragraphs[0] ?? `Compara los precios oficiales de las gasolineras de ${location.displayName} y abre la ruta hacia la estación elegida.`}</p>
        </section>

        {stations.length ? <CityMap city={location.displayName} stations={areaStations} radiusKm={AREA_RADIUS_KM} /> : null}

        {primary ? (
          <section className="market" aria-label={`Precios más bajos ${hasSurroundings ? "cerca de" : "en"} ${location.displayName} hoy`}>
            <div className="market-head">
              <h2>Los precios más bajos {hasSurroundings ? "cerca de" : "en"} {location.displayName} hoy</h2>
              <p>
                {insights.trend ? `La gasolina 95 ha ${insights.trend.change <= 0 ? "bajado" : "subido"} ${fmtPrice(Math.abs(insights.trend.change) * 100, 1)} céntimos desde el ${dayLabel(insights.trend.from)}. ` : ""}
                {insights.open24h.length ? `${insights.open24h.length} de sus ${stations.length} gasolineras abren las 24 horas.` : ""}
              </p>
            </div>
            <Totem
              label={`Precio más bajo de cada combustible ${hasSurroundings ? `a menos de ${AREA_RADIUS_KM} km de` : "en"} ${location.displayName}`}
              cells={fuelTotem}
            />
          </section>
        ) : (
          <p className="gg-note">Los precios de esta ciudad no están disponibles temporalmente. Puedes volver a intentarlo desde <Link href="/cerca">Cerca de mí</Link>.</p>
        )}

        {hasTrend ? (
          <ChartCard
            title={`Gasolina 95 en ${location.displayName} frente a ${sameName ? "su provincia" : provinceName} y España`}
            subtitle="Precio medio diario en los últimos 30 días, en €/L."
            legend={<><LegendItem color="var(--s1)" label={location.displayName} /><LegendItem color="var(--s2)" label={`Provincia de ${provinceName}`} /><LegendItem color="var(--s3)" label="España (península y Baleares)" /></>}
            table={{ head: ["Día", location.displayName, `Provincia de ${provinceName}`, "España"], rows: dates.map((date, i) => [dayLabel(date), insights.daily.g95[i] !== null ? fmtPrice(insights.daily.g95[i] as number) : "—", provinceSeries[i] !== null ? fmtPrice(provinceSeries[i] as number) : "—", spainSeries[i] !== null ? fmtPrice(spainSeries[i] as number) : "—"]).reverse() }}
          >
            <MultiLineChart dates={dates} series={[
              { name: location.displayName, color: "var(--s1)", values: insights.daily.g95 },
              { name: `Provincia de ${provinceName}`, color: "var(--s2)", values: provinceSeries },
              { name: "España", color: "var(--s3)", values: spainSeries },
            ]} />
          </ChartCard>
        ) : null}

        {areaG95.length >= 3 ? (
          <div className="gg-grid-2">
            <ChartCard
              title="Cómo se reparten los precios"
              subtitle={`Cada punto es una gasolinera de ${areaLabel}${hasSurroundings ? ` (${AREA_RADIUS_KM} km)` : ""}. Cuanto más a la izquierda, más barata.`}
              table={{ head: ["Gasolinera", "Dirección", "Gasolina 95"], rows: areaG95.map((s) => [displayBrand(s.brand), placeOf(s), fmtPrice(s.g95 as number)]) }}
            >
              <PriceStrip items={areaG95.map((s) => ({ price: s.g95 as number, label: displayBrand(s.brand), sub: placeOf(s) }))} average={areaG95Average} />
            </ChartCard>
            {brandRows.length >= 2 ? (
              <ChartCard
                title={`Marcas en ${areaLabel}`}
                subtitle="Gasolina 95, media por marca (2 o más estaciones)."
                table={{ head: ["Marca", "Gasolina 95", "Estaciones"], rows: brandRows.map((b) => [b.label, fmtPrice(b.value), b.note]) }}
              >
                <DotRanking rows={brandRows} />
              </ChartCard>
            ) : (
              <section className="gg-card chart-card">
                <header className="chart-card-head"><div><h3>Lo que te ahorras</h3><p>Llenando 50 litros en la más barata frente a la más cara.</p></div></header>
                <div className="big-figure">{formatEuros(((areaG95.at(-1)?.g95 ?? 0) - (areaG95[0]?.g95 ?? 0)) * 50)}</div>
              </section>
            )}
          </div>
        ) : null}

        {paragraphs.length > 1 ? (
          <section className="gg-card prose-card">
            <p className="eyebrow">Análisis de precios</p>
            <h2>Así está el precio de la gasolina en {location.displayName}</h2>
            {outsideTip ? <p>{outsideTip}</p> : null}
            {paragraphs.slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p>Esta página se actualiza cada día con los precios que las estaciones comunican al Ministerio para la Transición Ecológica. En <Link href={radarUrl}>Cerca de mí</Link> ves los precios del momento.</p>
          </section>
        ) : null}

        <section className="band-cta gg-glass">
          <div><h2>¿Cuál te conviene a ti?</h2><p>Teniendo en cuenta dónde estás, si está abierta y lo que cuesta llegar.</p></div>
          <Link className="gg-cta" href={radarUrl}>Ver cerca de mí</Link>
        </section>

        <section className="gg-faq" aria-labelledby="faq-title">
          <p className="eyebrow">Preguntas frecuentes</p>
          <h2 id="faq-title">Repostar en {location.displayName}</h2>
          {allFaqs.map((faq) => (
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
