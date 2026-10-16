import Link from "next/link";
import { CITY_FUELS, formatCents, formatPrice, getCityStations } from "@/lib/city-insights";
import { SEO_PROVINCES, SITEMAP_SEO_LOCATIONS, getSeoLocationPath, getSeoProvincePath } from "@/lib/seo-locations";
import { getFallbackStations, getFallbackUpdatedAt } from "@/lib/stations";

const LOWER_TAX_PROVINCES = new Set(["35", "38", "51", "52"]);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

// Contenido estático de la portada: Google lo lee sin ejecutar el radar y
// reparte enlaces internos hacia las páginas de ciudad y provincia.
export function HomeSeo() {
  const stations = getFallbackStations().filter((station) => !station.provinceId || !LOWER_TAX_PROVINCES.has(station.provinceId));
  const national = CITY_FUELS.map(({ key, label }) => {
    const prices = stations.map((station) => station[key]).filter((price): price is number => price !== null);
    return { key, label, average: mean(prices), cheapest: Math.min(...prices) };
  });
  const g95 = national[0];

  // Canarias, Ceuta y Melilla tienen otra fiscalidad sobre el carburante: si se
  // mezclan con la península ocupan todo el ranking.
  const cities = SITEMAP_SEO_LOCATIONS.filter((location) => !LOWER_TAX_PROVINCES.has(location.provinceId)).flatMap((location) => {
    const prices = getCityStations(location).map((station) => station.g95).filter((price): price is number => price !== null);
    return prices.length >= 5 ? [{ location, average: mean(prices) }] : [];
  }).sort((a, b) => a.average - b.average);
  const cheapestCities = cities.slice(0, 10);
  const updatedAt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${getFallbackUpdatedAt()}T12:00:00Z`));

  return (
    <section className="home-seo" aria-labelledby="home-seo-title">
      <div className="home-seo-intro">
        <p className="eyebrow">Precios oficiales · {updatedAt}</p>
        <h2 id="home-seo-title">El precio de la gasolina en España, hoy.</h2>
        <p>
          GasolinaGo compara cada día los precios que las gasolineras de España comunican al Ministerio para la Transición Ecológica.
          En la península y Baleares la {g95.label.toLowerCase()} cuesta de media {formatPrice(g95.average)} y el diésel A {formatPrice(national[1].average)}.
          {cheapestCities[0] ? <> La ciudad con la gasolina más barata hoy es {cheapestCities[0].location.displayName}, con una media de {formatPrice(cheapestCities[0].average)}: {formatCents(g95.average - cheapestCities[0].average)} por debajo de la media.</> : null}
          {" "}En Canarias, Ceuta y Melilla los precios son más bajos porque el carburante paga menos impuestos.
        </p>
      </div>

      <div className="home-seo-grid">
        <div>
          <h3>Gasolina 95 más barata hoy (península y Baleares)</h3>
          <ol>
            {cheapestCities.map(({ location, average }) => (
              <li key={`${location.provinceSlug}/${location.citySlug}`}>
                <Link href={getSeoLocationPath(location)}>{location.displayName}</Link>
                <span>{formatPrice(average)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3>Gasolineras por provincia</h3>
          <ul className="home-seo-provinces">
            {SEO_PROVINCES.map((province) => (
              <li key={province.slug}><Link href={getSeoProvincePath(province)}>{province.displayName}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
