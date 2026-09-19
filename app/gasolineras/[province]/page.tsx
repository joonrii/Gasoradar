import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedRouteLink } from "@/components/tracked-route-link";
import {
  SEO_PROVINCES,
  getSeoLocationPath,
  getSeoProvince,
  getSeoProvincePath,
} from "@/lib/seo-locations";
import { getFallbackStations, getFallbackUpdatedAt } from "@/lib/stations";
import type { FuelKey, Station } from "@/lib/types";

export const dynamicParams = false;

type Props = { params: Promise<{ province: string }> };

const FUELS: { key: FuelKey; label: string }[] = [
  { key: "g95", label: "Gasolina 95" },
  { key: "diesel", label: "Diésel A" },
];

const price = (value: number) => `${value.toFixed(3).replace(".", ",")} €/L`;

function ranking(stations: Station[], fuel: FuelKey) {
  return stations
    .filter((station) => station[fuel] !== null)
    .toSorted((a, b) => (a[fuel] ?? Infinity) - (b[fuel] ?? Infinity))
    .slice(0, 10);
}

export function generateStaticParams() {
  return SEO_PROVINCES.map((province) => ({ province: province.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { province: provinceSlug } = await params;
  const province = getSeoProvince(provinceSlug);
  if (!province) return {};
  const title = `Gasolineras más baratas en ${province.displayName} hoy`;
  const description = `Compara precios oficiales en ${province.stationCount} gasolineras de ${province.displayName}. Consulta los municipios y estaciones con gasolina y diésel más baratos.`;
  const url = getSeoProvincePath(province);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", locale: "es_ES" },
  };
}

export default async function ProvincePage({ params }: Props) {
  const { province: provinceSlug } = await params;
  const province = getSeoProvince(provinceSlug);
  if (!province) notFound();

  const stations = getFallbackStations().filter((station) => station.province === province.name);
  const updatedAt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${getFallbackUpdatedAt()}T12:00:00Z`));
  const pageUrl = `https://www.gasolinago.com${getSeoProvincePath(province)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "GasolinaGo", item: "https://www.gasolinago.com" },
          { "@type": "ListItem", position: 2, name: "Gasolineras", item: "https://www.gasolinago.com/gasolineras" },
          { "@type": "ListItem", position: 3, name: province.displayName, item: pageUrl },
        ],
      },
      {
        "@type": "ItemList",
        name: `Municipios con gasolineras en ${province.displayName}`,
        numberOfItems: province.locations.length,
        itemListElement: province.locations.map((location, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: location.displayName,
          url: `https://www.gasolinago.com${getSeoLocationPath(location)}`,
        })),
      },
    ],
  };

  return (
    <main className="city-shell province-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="city-topbar">
        <Link href="/" className="brand" aria-label="GasolinaGo, inicio"><span className="brand-mark">G</span><span>Gasolina<strong>Go</strong></span></Link>
        <nav className="city-nav" aria-label="Navegación principal"><Link href="/observatorio">Datos</Link><Link href="/blog">Blog</Link><Link href="/gasolineras">Todas las provincias</Link></nav>
      </header>

      <nav className="breadcrumbs" aria-label="Migas de pan"><Link href="/">Inicio</Link><span>/</span><Link href="/gasolineras">Gasolineras</Link><span>/</span><strong>{province.displayName}</strong></nav>

      <section className="city-hero city-hero-detail">
        <div><p className="eyebrow">Datos oficiales · {updatedAt}</p><h1>Gasolineras más baratas<br />en <em>{province.displayName}.</em></h1></div>
        <p>Compara precios de {province.stationCount} estaciones y entra en tu municipio para encontrar la opción más económica cerca de ti.</p>
      </section>

      <section className="province-stats" aria-label="Cobertura de la provincia">
        <div><span>Estaciones analizadas</span><strong>{stations.length}</strong></div>
        <div><span>Municipios con página</span><strong>{province.locations.length}</strong></div>
        <div><span>Actualización</span><strong>Diaria</strong></div>
      </section>

      {province.locations.length ? (
        <section className="province-municipalities">
          <div className="city-section-title"><div><p className="eyebrow">Busca tu zona</p><h2>Municipios de {province.displayName}</h2></div></div>
          <div>{province.locations.map((location) => <Link href={getSeoLocationPath(location)} key={location.citySlug}><span>{location.displayName}</span><small>{location.stationCount} estaciones</small><b>→</b></Link>)}</div>
        </section>
      ) : null}

      {FUELS.map(({ key, label }) => {
        const ranked = ranking(stations, key);
        if (!ranked.length) return null;
        return (
          <section className="city-ranking" key={key}>
            <div className="city-section-title"><div><p className="eyebrow">Top provincial</p><h2>{label} más barata en {province.displayName}</h2></div><span>{ranked.length} mejores precios</span></div>
            <div className="city-station-list">
              {ranked.map((station, index) => (
                <article className="city-station" key={`${key}-${station.id}`}>
                  <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                  <div><h3>{station.brand}</h3><p>{station.address} · {station.city}</p><small>{station.schedule}</small></div>
                  <strong>{price(station[key] as number)}</strong>
                  <TrackedRouteLink station={station} fuel={key} />
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <footer className="city-footer"><span>Fuente: Ministerio para la Transición Ecológica · Actualizado el {updatedAt}</span><Link href="/privacidad">Privacidad</Link></footer>
    </main>
  );
}
