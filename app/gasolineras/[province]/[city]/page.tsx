import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedRouteLink } from "@/components/tracked-route-link";
import { getSeoLocation, getSeoLocationPath } from "@/lib/locations";
import { getFallbackStations, getProvinceStations } from "@/lib/stations";
import type { FuelKey, Station } from "@/lib/types";

export const revalidate = 1800;

type Props = { params: Promise<{ province: string; city: string }> };

type FuelSummary = {
  fuel: FuelKey;
  label: string;
  stations: Station[];
  cheapest: number;
  average: number;
  savingFor50Litres: number;
};

function summarize(stations: Station[], fuel: FuelKey, label: string): FuelSummary | null {
  const priced = stations
    .filter((station) => station[fuel] !== null)
    .toSorted((a, b) => (a[fuel] ?? Number.POSITIVE_INFINITY) - (b[fuel] ?? Number.POSITIVE_INFINITY));
  if (!priced.length) return null;
  const prices = priced.map((station) => station[fuel] as number);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  return {
    fuel,
    label,
    stations: priced.slice(0, 8),
    cheapest: prices[0],
    average,
    savingFor50Litres: Math.max(0, (average - prices[0]) * 50),
  };
}

function price(value: number) {
  return `${value.toFixed(3).replace(".", ",")} €/L`;
}

async function loadCityStations(provinceId: string, city: string, province: string) {
  try {
    const stations = await getProvinceStations(provinceId);
    return { stations: stations.filter((station) => station.city === city), source: "live" as const };
  } catch {
    const stations = getFallbackStations().filter(
      (station) => station.city === city && station.province === province,
    );
    return { stations, source: "fallback" as const };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { province, city } = await params;
  const location = getSeoLocation(province, city);
  if (!location) return {};
  const title = `Gasolineras más baratas en ${location.displayName} hoy`;
  const description = `Compara precios oficiales de gasolina 95 y diésel en ${location.displayName}. Encuentra la gasolinera más barata y abre la ruta para llegar.`;
  const url = getSeoLocationPath(location);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", locale: "es_ES" },
  };
}

export default async function CityPage({ params }: Props) {
  const { province, city } = await params;
  const location = getSeoLocation(province, city);
  if (!location) notFound();

  const { stations, source } = await loadCityStations(
    location.provinceId,
    location.city,
    location.province,
  );
  const summaries = [
    summarize(stations, "g95", "Gasolina 95"),
    summarize(stations, "diesel", "Diésel A"),
  ].filter((summary): summary is FuelSummary => summary !== null);
  const primary = summaries[0];
  const radarUrl = `/?ciudad=${encodeURIComponent(location.city)}&provincia=${encodeURIComponent(location.province)}`;
  const pageUrl = `https://www.gasolinago.com${getSeoLocationPath(location)}`;
  const today = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date());
  const itemList = primary?.stations ?? [];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "GasolinaGo", item: "https://www.gasolinago.com" },
          { "@type": "ListItem", position: 2, name: "Gasolineras", item: "https://www.gasolinago.com/gasolineras" },
          { "@type": "ListItem", position: 3, name: location.displayName, item: pageUrl },
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
            name: station.brand,
            address: station.address,
            geo: { "@type": "GeoCoordinates", latitude: station.lat, longitude: station.lng },
          },
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
        <nav className="city-nav" aria-label="Navegación principal"><Link href="/observatorio">Datos</Link><Link href="/blog">Blog</Link><Link href="/gasolineras">Todas las ciudades</Link></nav>
      </header>

      <nav className="breadcrumbs" aria-label="Migas de pan">
        <Link href="/">Inicio</Link><span>/</span><Link href="/gasolineras">Gasolineras</Link><span>/</span><strong>{location.displayName}</strong>
      </nav>

      <section className="city-hero city-hero-detail">
        <div>
          <p className="eyebrow">Precios oficiales · {today}</p>
          <h1>Gasolineras más baratas<br />en <em>{location.displayName}.</em></h1>
        </div>
        <p>
          Compara precios actualizados, calcula el ahorro frente a la media de la ciudad y abre la ruta hacia la estación elegida.
        </p>
      </section>

      {primary ? (
        <section className="city-summary" aria-label="Resumen de precios">
          <div><span>Estaciones con precio</span><strong>{stations.filter((station) => station.g95 !== null).length}</strong></div>
          <div><span>Gasolina 95 más barata</span><strong>{price(primary.cheapest)}</strong></div>
          <div><span>Media de la ciudad</span><strong>{price(primary.average)}</strong></div>
          <div><span>Ahorro en 50 litros</span><strong>{primary.savingFor50Litres.toFixed(2).replace(".", ",")} €</strong></div>
        </section>
      ) : (
        <p className="city-notice">Los precios de esta ciudad no están disponibles temporalmente. Puedes volver a intentarlo desde el radar general.</p>
      )}

      {summaries.map((summary) => (
        <section className="city-ranking" key={summary.fuel}>
          <div className="city-section-title">
            <div>
              <p className="eyebrow">Ranking actual</p>
              <h2>{summary.label} barata en {location.displayName}</h2>
            </div>
            <span>Media: {price(summary.average)}</span>
          </div>
          <div className="city-station-list">
            {summary.stations.map((station, index) => (
              <article className="city-station" key={`${summary.fuel}-${station.id}`}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{station.brand}</h3>
                  <p>{station.address}</p>
                  <small>{station.schedule}</small>
                </div>
                <strong>{price(station[summary.fuel] as number)}</strong>
                <TrackedRouteLink station={station} fuel={summary.fuel} />
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="city-explainer">
        <div>
          <p className="eyebrow">Decide con datos</p>
          <h2>¿Cómo encontrar la mejor gasolinera en {location.displayName}?</h2>
        </div>
        <div>
          <p>
            El precio más bajo no siempre es la mejor opción si obliga a recorrer muchos kilómetros. Compara el ahorro estimado con la distancia y el horario antes de decidir.
          </p>
          <p>
            Los datos proceden del Ministerio y se revisan cada 30 minutos. GasolinaGo no modifica los precios comunicados por las estaciones.
          </p>
        </div>
      </section>

      <section className="city-cta">
        <div><p className="eyebrow">Vista interactiva</p><h2>Explora {location.displayName} en el radar.</h2></div>
        <Link href={radarUrl}>Abrir mapa y filtros <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="city-footer">
        <span>Fuente: Ministerio para la Transición Ecológica · {source === "live" ? "Datos en directo" : "Copia de respaldo"}</span>
        <Link href="/privacidad">Privacidad</Link>
      </footer>
    </main>
  );
}
