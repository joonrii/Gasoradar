import type { Metadata } from "next";
import Link from "next/link";
import { ChartCard, LegendItem } from "@/components/charts/chart-card";
import { dayLabel, fmtCents, fmtPrice, signedCents } from "@/components/charts/chart-utils";
import { CommunityMap, DotRanking } from "@/components/charts/charts";
import { StatTile } from "@/components/charts/sparkline";
import { TrendHero } from "@/components/charts/trend-hero";
import { CitySearch } from "@/components/city-search";
import { Ambient, SiteFooter, SiteHeader } from "@/components/site-header";
import { TankCard, ZoneCard } from "@/components/zone-card";
import { displayBrand } from "@/lib/city-insights";
import { getCommunityShapes } from "@/lib/community-shapes";
import { getBrandAverages, getCheapestCities, getCommunityAverages, getNationalSeries, getTodayAverages } from "@/lib/market";
import { getSeoLocationPath } from "@/lib/seo-locations";
import { getFallbackUpdatedAt } from "@/lib/stations";
import { getDefaultZone } from "@/lib/zone";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SITE = "https://www.gasolinago.com";

export default function Home() {
  const national = getNationalSeries();
  const today = getTodayAverages();
  const g95 = national.values.g95;
  const diesel = national.values.diesel;
  const last30 = (values: Array<number | null>) => values.slice(-30);
  const delta = (values: Array<number | null>, back: number) => (values.at(-1) ?? 0) - (values.at(-1 - back) ?? 0);
  const g95Day = delta(g95, 1);
  const dieselDay = delta(diesel, 1);
  const g95Month = delta(g95, Math.min(29, g95.length - 1));
  const brands = getBrandAverages();
  const cities = getCheapestCities(10);
  const communities = getCommunityAverages();
  const shapes = getCommunityShapes();
  const zone = getDefaultZone();
  const updated = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${getFallbackUpdatedAt()}T12:00:00Z`));
  const comparable = communities.filter((community) => !community.lowerTax).sort((a, b) => a.average - b.average);
  const mapShapes = shapes.shapes.map((shape) => {
    const community = communities.find((item) => item.code === shape.code);
    return { ...shape, name: community?.name ?? shape.code, average: community?.average ?? null, lowerTax: community?.lowerTax ?? false };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE}/#website`, name: "GasolinaGo", alternateName: ["Gasolina Go", "gasolinago.com"], url: `${SITE}/`, publisher: { "@id": `${SITE}/#organization` }, inLanguage: "es-ES" },
      { "@type": "Organization", "@id": `${SITE}/#organization`, name: "GasolinaGo", alternateName: "Gasolina Go", url: `${SITE}/`, logo: `${SITE}/icon.svg` },
      {
        "@type": "WebApplication", name: "GasolinaGo", url: `${SITE}/`, applicationCategory: "TravelApplication", operatingSystem: "Cualquier navegador",
        description: "Comparador gratuito de precios oficiales de gasolina y diésel en España.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        featureList: ["Comparar precios de carburante", "Buscar gasolineras por ciudad", "Ver la mejor opción teniendo en cuenta la distancia", "Abrir rutas en Google Maps"],
      },
    ],
  };

  return (
    <>
      <Ambient />
      <SiteHeader current="/" />
      <main className="gg-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

        <section className="home-hero gg-glass">
          <div className="home-hero-copy">
            <p className="eyebrow">Precios oficiales · {updated}</p>
            <h1>La gasolina más barata,<br /><em>a la vuelta de la esquina.</em></h1>
            <p>Comparamos cada día los precios de las {today.stationCount.toLocaleString("es-ES")} gasolineras de España y te decimos cuál te conviene, no solo cuál es la más barata.</p>
            <div className="hero-actions">
              <Link className="gg-cta" href="/cerca">Ver gasolineras cerca de mí <span aria-hidden="true">→</span></Link>
              <CitySearch />
            </div>
          </div>
          <ZoneCard initial={zone} />
        </section>

        <section className="stat-tiles" aria-label="Precios medios de hoy">
          <StatTile label="Gasolina 95 · media hoy" value={fmtPrice(today.g95)} unit="€/L" delta={`${g95Day <= 0 ? "↓" : "↑"} ${fmtCents(g95Day)} desde ayer`} deltaTone={g95Day <= 0 ? "good" : "bad"} spark={last30(g95)} sparkColor="var(--s1)" />
          <StatTile label="Diésel A · media hoy" value={fmtPrice(today.diesel)} unit="€/L" delta={`${dieselDay <= 0 ? "↓" : "↑"} ${fmtCents(dieselDay)} desde ayer`} deltaTone={dieselDay <= 0 ? "good" : "bad"} spark={last30(diesel)} sparkColor="var(--s2)" />
          <StatTile label="Gasolina 95 en 30 días" value={`${g95Month < 0 ? "−" : "+"}${fmtPrice(Math.abs(g95Month) * 100, 1)}`} unit="cént." delta={`${g95Month < 0 ? "Ha bajado" : "Ha subido"} desde el ${dayLabel(national.dates.at(-30) ?? national.dates[0])}`} deltaTone={g95Month < 0 ? "good" : "bad"} />
          <StatTile label="Gasolineras comparadas" value={today.stationCount.toLocaleString("es-ES")} delta="Datos oficiales, cada día" />
        </section>

        <TrendHero dates={national.dates} values={national.values} />

        <div className="gg-grid-2">
          <div className="gg-stack">
            <TankCard initial={zone} />
            <ChartCard
              title="¿Dónde es más barata la gasolina?"
              subtitle="Gasolina 95 hoy, media de cada comunidad autónoma."
              legend={<><span>Más barata</span><span className="ramp-steps">{[1, 2, 3, 4, 5].map((k) => <i key={k} style={{ background: `var(--q${k})` }} />)}</span><span>Más cara</span></>}
              table={{ head: ["Comunidad", "Gasolina 95", "Vs. media", "Estaciones"], rows: comparable.map((c) => [c.name, fmtPrice(c.average), signedCents(c.average - today.g95), String(c.count)]) }}
            >
              <CommunityMap width={shapes.width} height={shapes.height} canaryBox={shapes.canaryBox} shapes={mapShapes} nationalAverage={today.g95} />
              <ol className="rank-list two-cols">
                {comparable.map((c, i) => (
                  <li key={c.code}><span className="n">{String(i + 1).padStart(2, "0")}</span><span className="name"><b>{c.name}</b></span><span className="v">{fmtPrice(c.average)}</span></li>
                ))}
              </ol>
            </ChartCard>
          </div>
          <div className="gg-stack">
            <ChartCard
              title="¿Qué marca es más barata?"
              subtitle="Gasolina 95, media de cada marca con más de 80 estaciones."
              table={{ head: ["Marca", "Gasolina 95", "Estaciones"], rows: brands.map((b) => [displayBrand(b.name), fmtPrice(b.average), String(b.count)]) }}
            >
              <DotRanking rows={brands.map((b) => ({ label: displayBrand(b.name), value: b.average, note: `${b.count} estaciones` }))} />
            </ChartCard>
            <ChartCard title="Ciudades con la gasolina más barata" subtitle="Municipios con 12 o más gasolineras, media de gasolina 95." legend={<LegendItem color="var(--s1)" label="Toca una ciudad para ver sus gasolineras" box />}>
              <ol className="rank-list">
                {cities.map((c, i) => (
                  <li key={getSeoLocationPath(c.location)}>
                    <span className="n">{String(i + 1).padStart(2, "0")}</span>
                    <Link className="name" href={getSeoLocationPath(c.location)}><b>{c.location.displayName}</b><small>{c.count} gasolineras · desde {fmtPrice(c.min)}</small></Link>
                    <span className="v">{fmtPrice(c.average)}</span>
                  </li>
                ))}
              </ol>
            </ChartCard>
          </div>
        </div>
        <p className="gg-note">Las medias de España no incluyen Canarias, Ceuta ni Melilla: allí el carburante paga menos impuestos y sus precios no son comparables con los de la península.</p>
      </main>
      <SiteFooter />
    </>
  );
}
