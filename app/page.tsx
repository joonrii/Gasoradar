import type { Metadata } from "next";
import Link from "next/link";
import { ChartCard } from "@/components/charts/chart-card";
import { fmtPrice, signedCents } from "@/components/charts/chart-utils";
import { CommunityMap, DotRanking } from "@/components/charts/charts";
import { TrendHero } from "@/components/charts/trend-hero";
import { Ambient, SiteFooter, SiteHeader } from "@/components/site-header";
import { PumpHero } from "@/components/pump-hero";
import { Totem } from "@/components/totem";
import { displayBrand } from "@/lib/city-insights";
import { getCommunityShapes } from "@/lib/community-shapes";
import { getBrandAverages, getCheapestCities, getCommunityAverages, getNationalSeries, getTodayAverages, getTotem } from "@/lib/market";
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
  const totem = getTotem();
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

        <PumpHero initial={zone} updated={updated} />

        <section className="market" aria-labelledby="market-title">
          <div className="market-head">
            <h2 id="market-title">El mercado hoy</h2>
            <p>Precio medio en España (península y Baleares) y cómo ha cambiado desde ayer.</p>
          </div>
          <Totem label="Precio medio en España hoy" cells={totem.map((row) => ({ fuel: row.fuel, price: row.today, change: row.yesterday === null ? null : row.today - row.yesterday }))} />
        </section>

        <TrendHero dates={national.dates} values={national.values} />

        <div className="gg-grid-2">
          <div className="gg-stack">
            <ChartCard
              title="¿Dónde es más barata la gasolina?"
              subtitle="Gasolina 95 hoy, media de cada comunidad autónoma."
              legend={<><span>Más barata</span><span className="ramp-steps">{[1, 2, 3, 4, 5].map((k) => <i key={k} style={{ background: `var(--q${k})` }} />)}</span><span>Más cara</span></>}
              table={{ head: ["Comunidad", "Gasolina 95", "Vs. media", "Estaciones"], rows: comparable.map((c) => [c.name, fmtPrice(c.average), signedCents(c.average - today.g95), String(c.count)]) }}
            >
              <CommunityMap width={shapes.width} height={shapes.height} canaryBox={shapes.canaryBox} shapes={mapShapes} nationalAverage={today.g95} />
              <ol className="rank-list two-cols">
                {comparable.map((c, i) => (
                  <li key={c.code}><span className="n">{i + 1}</span><span className="name"><b>{c.name}</b></span><span className="v">{fmtPrice(c.average)}</span></li>
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
            <ChartCard title="Ciudades con la gasolina más barata" subtitle="Municipios con 12 o más gasolineras, media de gasolina 95.">
              <ol className="rank-list">
                {cities.map((c, i) => (
                  <li key={getSeoLocationPath(c.location)}>
                    <span className="n">{i + 1}</span>
                    <Link className="name" href={getSeoLocationPath(c.location)}><b>{c.location.displayName}</b><small>{c.count} gasolineras, desde {fmtPrice(c.min)} €/L</small></Link>
                    <span className="v">{fmtPrice(c.average)}</span>
                  </li>
                ))}
              </ol>
            </ChartCard>
          </div>
        </div>
        <section className="band-cta gg-glass">
          <div><h2>¿Cuál te conviene a ti?</h2><p>La más barata no siempre compensa si está lejos. Te decimos cuál, según dónde estás, si está abierta y lo que cuesta llegar.</p></div>
          <Link className="gg-cta" href="/cerca">Ver gasolineras cerca de mí</Link>
        </section>
        <p className="gg-note">Las medias de España no incluyen Canarias, Ceuta ni Melilla: allí el carburante paga menos impuestos y sus precios no son comparables con los de la península.</p>
      </main>
      <SiteFooter />
    </>
  );
}
