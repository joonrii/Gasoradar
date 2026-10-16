import type { Metadata } from "next";
import Link from "next/link";
import { Ambient, SiteFooter, SiteHeader } from "@/components/site-header";
import { ObservatoryDashboard } from "@/components/observatory-dashboard";
import { getObservatoryData } from "@/lib/observatory-data";

export const metadata: Metadata = {
  title: "Observatorio de precios de gasolina en España",
  description: "Explora la evolución de los precios de gasolina y diésel en España, compara territorios y consulta los datos oficiales de los últimos 30 días.",
  alternates: { canonical: "/observatorio" },
  openGraph: { title: "Observatorio GasolinaGo", description: "30 días de datos oficiales para entender el precio del combustible en España.", url: "/observatorio", type: "website", locale: "es_ES" },
};

export default function ObservatoryPage() {
  const data = getObservatoryData();
  const jsonLd = { "@context": "https://schema.org", "@type": "Dataset", name: "Observatorio GasolinaGo", description: "Serie de precios de carburantes por territorio en España.", temporalCoverage: `${data.dates[0]}/${data.dates.at(-1)}`, spatialCoverage: { "@type": "Country", name: "España" }, creator: { "@type": "Organization", name: "GasolinaGo" }, license: "https://creativecommons.org/licenses/by/4.0/" };

  return <>
    <Ambient />
    <SiteHeader current="/observatorio" />
    <main className="observatory-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <section className="observatory-hero"><div><p className="eyebrow">Análisis de datos · España</p><h1>El precio,<br /><em>bajo la lupa.</em></h1></div><p>Explora 30 días de precios oficiales por comunidad. Compara tendencias, identifica las diferencias y entiende qué está pasando antes de repostar.</p></section>
    <ObservatoryDashboard national={data.national} territories={data.territories} coverage={data.coverage} />
    <section className="observatory-reports"><div><p className="eyebrow">Informes mensuales</p><h2>Del dato diario<br />a la historia completa.</h2></div><div><p>Publicamos análisis indexables con la evolución nacional, el precio por combustible y el ranking de comunidades. Una fotografía mensual que crecerá con el proyecto.</p><Link href="/observatorio/informes">Ver los informes <span aria-hidden="true">→</span></Link></div></section>
    <section className="observatory-method"><div><p className="eyebrow">Metodología</p><h2>Datos que se pueden revisar.</h2></div><p>Guardamos una fotografía diaria de los precios comunicados por las estaciones. Las medias territoriales se ponderan por el número de estaciones con precio disponible para cada combustible. El periodo nacional actual va del {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(new Date(`${data.dates[0]}T12:00:00`))} al {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${data.dates.at(-1)}T12:00:00`))}.</p></section>
    </main>
    <SiteFooter />
  </>;
}
