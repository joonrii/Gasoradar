import type { Metadata } from "next";
import Link from "next/link";
import { getMonthlyReports } from "@/lib/monthly-reports";

export const metadata: Metadata = {
  title: "Informes mensuales del precio de la gasolina en España",
  description: "Consulta los informes mensuales de GasolinaGo sobre la evolución del precio de la gasolina y el diésel en España y por comunidades autónomas.",
  alternates: { canonical: "/observatorio/informes" },
};

function price(value: number) { return value.toFixed(3).replace(".", ","); }

export default function MonthlyReportsPage() {
  const reports = getMonthlyReports();
  return <main className="observatory-shell">
    <header className="blog-topbar"><Link href="/" className="brand" aria-label="GasolinaGo, inicio"><span className="brand-mark">G</span><span>Gasolina<strong>Go</strong></span></Link><nav aria-label="Navegación principal"><Link href="/">Radar</Link><Link href="/gasolineras">Ciudades</Link><Link href="/observatorio" aria-current="page">Datos</Link><Link href="/blog">Blog</Link></nav></header>
    <section className="reports-hero"><p className="eyebrow">Archivo del Observatorio</p><h1>Un mes.<br /><em>Todos los datos.</em></h1><p>Informes periódicos sobre el precio de los carburantes en España: evolución nacional, diferencias territoriales y metodología visible.</p></section>
    <section className="report-archive" aria-label="Informes mensuales">
      {reports.map((report, index) => <Link className={`report-card${index === 0 ? " current" : ""}`} href={`/observatorio/informes/${report.slug}`} key={report.slug}>
        <span className="article-tag">{report.isComplete ? "Informe cerrado" : "Informe provisional"}</span>
        <h2>{report.label}</h2>
        <p>{report.days} días analizados · {report.coverage.provinces} provincias · {report.coverage.stations.toLocaleString("es-ES")} estaciones</p>
        <div><span>Media gasolina 95</span><strong>{price(report.fuels.g95?.average ?? 0)} <small>€/L</small></strong></div>
        <b>Ver el análisis <span aria-hidden="true">→</span></b>
      </Link>)}
    </section>
    <footer className="blog-footer"><span>GasolinaGo · Informes de datos abiertos</span><span><Link href="/observatorio">Abrir el observatorio</Link> · <Link href="/privacidad">Privacidad</Link></span></footer>
  </main>;
}

