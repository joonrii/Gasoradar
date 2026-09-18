import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogPriceChart } from "@/components/blog-price-chart";
import { ShareButton } from "@/components/share-button";
import { getMonthlyReport, getMonthlyReports, REPORT_FUELS } from "@/lib/monthly-reports";

type Props = { params: Promise<{ month: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getMonthlyReports().map((report) => ({ month: report.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const report = getMonthlyReport((await params).month);
  if (!report) return {};
  const cheapest = report.territories[0];
  const title = `Precio de la gasolina en ${report.label}: ${cheapest?.name ?? "España"}, el territorio más barato`;
  const description = `Analizamos ${report.days} días de precios oficiales: evolución de la gasolina 95, medias por comunidad y territorios más baratos en ${report.label}.`;
  return { title, description, alternates: { canonical: `/observatorio/informes/${report.slug}` }, openGraph: { title, description, type: "article", locale: "es_ES", url: `/observatorio/informes/${report.slug}`, publishedTime: report.latestDate } };
}

function price(value: number) { return value.toFixed(3).replace(".", ","); }
function signed(value: number, suffix = "") { return `${value >= 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}${suffix}`; }
function longDate(date: string) { return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)); }

export default async function MonthlyReportPage({ params }: Props) {
  const report = getMonthlyReport((await params).month);
  if (!report) notFound();
  const g95 = report.fuels.g95;
  const cheapest = report.territories[0];
  const mostExpensive = report.territories.at(-1);
  if (!g95 || !cheapest || !mostExpensive) notFound();
  const spread = mostExpensive.average - cheapest.average;
  const status = report.isComplete ? "Informe mensual cerrado" : `Informe provisional · actualizado el ${longDate(report.latestDate)}`;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: `Precio de la gasolina en ${report.label}`,
    description: `Evolución nacional y comparación territorial de precios de carburantes en ${report.label}.`,
    datePublished: report.latestDate, dateModified: report.latestDate,
    author: { "@type": "Organization", name: "GasolinaGo" }, publisher: { "@type": "Organization", name: "GasolinaGo" },
    mainEntityOfPage: `https://www.gasolinago.com/observatorio/informes/${report.slug}`,
  };

  return <main className="article-shell report-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <header className="blog-topbar"><Link href="/" className="brand" aria-label="GasolinaGo, inicio"><span className="brand-mark">G</span><span>Gasolina<strong>Go</strong></span></Link><nav aria-label="Navegación principal"><Link href="/">Radar</Link><Link href="/gasolineras">Ciudades</Link><Link href="/observatorio" aria-current="page">Datos</Link><Link href="/blog">Blog</Link></nav></header>
    <nav className="article-breadcrumbs" aria-label="Migas de pan"><Link href="/observatorio">Observatorio</Link><span>/</span><Link href="/observatorio/informes">Informes</Link><span>/</span><strong>{report.label}</strong></nav>
    <article>
      <header className="article-header"><span className="article-tag">{status}</span><h1>Precio de la gasolina en {report.label}</h1><p>La evolución nacional, las comunidades más baratas y la diferencia territorial calculadas con precios oficiales de {report.coverage.stations.toLocaleString("es-ES")} estaciones.</p><div className="article-byline"><div><span>Observatorio GasolinaGo</span><span>Periodo: {longDate(report.firstDate)} — {longDate(report.latestDate)}</span></div><ShareButton title={`Precio de la gasolina en ${report.label}`} /></div></header>
      <div className="article-body">
        <p className="article-lead">Durante el periodo analizado, la gasolina 95 tuvo un precio medio de <strong>{price(g95.average)} €/L</strong> en España. El último dato se situó en <strong>{price(g95.latest)} €/L</strong>, un {Math.abs(g95.changePercent).toFixed(1).replace(".", ",")}% {g95.changePercent >= 0 ? "por encima" : "por debajo"} del inicio.</p>
        <div className="article-stat-row"><div><span>Media del periodo</span><strong>{price(g95.average)}<small> €/L</small></strong></div><div className={g95.changePercent >= 0 ? "report-rise" : "report-fall"}><span>Cambio en el periodo</span><strong>{signed(g95.changePercent, "%")}</strong></div><div className="accent"><span>Comunidad más barata</span><strong>{cheapest.name}</strong></div></div>
        <h2>Así evolucionó el precio medio</h2>
        <p>La serie muestra el promedio nacional comunicado cada día. El primer dato del periodo fue de <strong>{price(g95.first)} €/L</strong> y el último de <strong>{price(g95.latest)} €/L</strong>.</p>
        <BlogPriceChart points={report.points} />
        <h2>El precio por tipo de combustible</h2>
        <p>La comparación utiliza el promedio ponderado de todas las observaciones estación-día disponibles en el periodo.</p>
        <div className="report-fuel-grid">{REPORT_FUELS.map((fuel) => { const value = report.fuels[fuel.key]; return value ? <div key={fuel.key}><span>{fuel.label}</span><strong>{price(value.average)} <small>€/L</small></strong><em>{signed(value.changePercent, "%")} en el periodo</em></div> : null; })}</div>
        <h2>¿Dónde fue más barata la gasolina?</h2>
        <p><strong>{cheapest.name}</strong> registró el promedio territorial más bajo, con {price(cheapest.average)} €/L. En el extremo contrario, <strong>{mostExpensive.name}</strong> alcanzó {price(mostExpensive.average)} €/L. La distancia entre ambas medias fue de <strong>{price(spread)} €/L</strong>.</p>
        <div className="article-table report-ranking" role="table" aria-label={`Precio medio de gasolina 95 por comunidad en ${report.label}`}><div className="article-table-head" role="row"><span>Territorio</span><span>Precio medio</span><span>Estaciones</span></div>{report.territories.map((territory, index) => <div role="row" key={territory.name}><strong><small>{String(index + 1).padStart(2, "0")}</small>{territory.name}</strong><span>{price(territory.average)} €/L</span><span>{territory.stations.toLocaleString("es-ES")}</span></div>)}</div>
        {!report.isComplete && <div className="article-callout"><strong>Un informe vivo</strong><p>Este mes todavía no ha terminado. Actualizaremos las cifras a medida que entren nuevos datos y cerraremos el informe al finalizar el periodo.</p><Link href="/observatorio">Explorar los datos diarios →</Link></div>}
        <div className="methodology"><p className="eyebrow">Metodología</p><p>Periodo observado: del {longDate(report.firstDate)} al {longDate(report.latestDate)} ({report.days} días). Cobertura del último día: {report.coverage.provinces} provincias y {report.coverage.stations.toLocaleString("es-ES")} estaciones con precio de gasolina 95. Las medias mensuales ponderan cada precio diario por el número de estaciones con dato disponible. Fuente primaria: datos abiertos del Ministerio para la Transición Ecológica, procesados por GasolinaGo.</p></div>
      </div>
      <footer className="article-end"><p className="eyebrow">Datos interactivos</p><h2>Compara territorios<br />día a día.</h2><Link href="/observatorio">Abrir observatorio <span aria-hidden="true">→</span></Link></footer>
    </article>
    <footer className="blog-footer"><span>GasolinaGo · Observatorio de datos abiertos</span><span><Link href="/observatorio/informes">Todos los informes</Link> · <Link href="/privacidad">Privacidad</Link></span></footer>
  </main>;
}

