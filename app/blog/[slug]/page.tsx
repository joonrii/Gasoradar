import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogPriceChart } from "@/components/blog-price-chart";
import { ShareButton } from "@/components/share-button";
import { BLOG_POSTS, formatBlogDate, getBlogPost } from "@/lib/blog";
import { getG95ThirtyDayInsight } from "@/lib/observatory";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      locale: "es_ES",
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
    },
  };
}

function ObservatoryArticle() {
  const insight = getG95ThirtyDayInsight();
  const cheapest = insight.provinces[0];
  const mostExpensive = insight.provinces.at(-1);
  const rising = insight.change >= 0;
  return <>
    <p className="article-lead">En los últimos 30 días, el precio medio ponderado de la gasolina 95 en nuestra cobertura histórica pasó de <strong>{insight.first.toFixed(3).replace(".", ",")} €/L</strong> a <strong>{insight.latest.toFixed(3).replace(".", ",")} €/L</strong>. Son {Math.abs(insight.change * 100).toFixed(1).replace(".", ",")} céntimos {rising ? "más" : "menos"} por litro.</p>
    <div className="article-stat-row">
      <div><span>Inicio del periodo</span><strong>{insight.first.toFixed(3).replace(".", ",")}<small> €/L</small></strong></div>
      <div><span>Último dato</span><strong>{insight.latest.toFixed(3).replace(".", ",")}<small> €/L</small></strong></div>
      <div className="accent"><span>Variación</span><strong>{insight.change >= 0 ? "+" : ""}{insight.changePercent.toFixed(1).replace(".", ",")}<small>%</small></strong></div>
    </div>
    <h2>Una tendencia claramente {rising ? "ascendente" : "descendente"}</h2>
    <p>El gráfico no representa una estimación ni una serie inventada. Calculamos cada punto ponderando el precio medio provincial por el número de estaciones con precio comunicado ese día.</p>
    <BlogPriceChart points={insight.points} />
    <h2>La diferencia entre provincias</h2>
    <p>En el último día analizado, <strong>{cheapest?.province}</strong> presenta el promedio más bajo de la cobertura, mientras que <strong>{mostExpensive?.province}</strong> registra el más alto. La comparación se limita a las provincias con histórico completo disponible actualmente en GasolinaGo.</p>
    <div className="article-table" role="table" aria-label="Precio por provincia">
      <div className="article-table-head" role="row"><span>Provincia</span><span>Precio medio</span><span>Estaciones</span></div>
      {insight.provinces.map((province) => <div role="row" key={province.province}><strong>{province.province}</strong><span>{province.med.toFixed(3).replace(".", ",")} €/L</span><span>{province.n}</span></div>)}
    </div>
    <div className="methodology"><p className="eyebrow">Metodología y límites</p><p>Periodo: los 30 últimos días disponibles hasta el {formatBlogDate(insight.latestDate)}. Combustible: gasolina 95. Cobertura del último día: {insight.provinces.length} provincias y {insight.stationCount.toLocaleString("es-ES")} estaciones con precio. Fuente primaria: datos abiertos del Ministerio para la Transición Ecológica, procesados por GasolinaGo. La media nacional pondera cada territorio por el número de estaciones con precio disponible.</p></div>
  </>;
}

function SavingsArticle() {
  const examples = [5, 10, 15, 20].map((cents) => ({ cents, saving: (cents / 100) * 50 }));
  return <>
    <p className="article-lead">Una diferencia de unos pocos céntimos parece pequeña cuando miramos el precio por litro. Al multiplicarla por un depósito completo, la decisión empieza a importar.</p>
    <div className="formula-card"><span>Diferencia por litro</span><b>×</b><span>Litros repostados</span><b>=</b><strong>Ahorro real</strong></div>
    <h2>Un ejemplo sencillo</h2>
    <p>Si una estación vende la gasolina a 1,72 €/L y otra a 1,82 €/L, la diferencia es de 10 céntimos. En un repostaje de 50 litros, elegir la primera supone pagar <strong>5 euros menos</strong>.</p>
    <div className="article-table" role="table" aria-label="Ejemplos de ahorro en un depósito de 50 litros">
      <div className="article-table-head" role="row"><span>Diferencia</span><span>Depósito</span><span>Ahorro</span></div>
      {examples.map((example) => <div role="row" key={example.cents}><strong>{example.cents} cént./L</strong><span>50 litros</span><span>{example.saving.toFixed(2).replace(".", ",")} €</span></div>)}
    </div>
    <h2>Compara la zona que realmente utilizas</h2>
    <p>No siempre interesa escoger el precio mínimo de toda una provincia. Compara primero las estaciones de tu ciudad y alrededores, revisa el horario y elige una que encaje en un trayecto que ya vayas a realizar.</p>
    <div className="article-callout"><strong>La regla rápida</strong><p>Cada 2 céntimos de diferencia equivalen aproximadamente a 1 euro en un depósito de 50 litros.</p><Link href="/">Comparar precios cerca de mí →</Link></div>
    <h2>Frecuencia también significa dinero</h2>
    <p>Un ahorro de 5 euros no cambia un presupuesto por sí solo, pero repetido dos veces al mes suma 120 euros al año. Por eso conviene comparar de forma habitual y no solamente cuando los precios aparecen en las noticias.</p>
  </>;
}

function PriceFactorsArticle() {
  return <>
    <p className="article-lead">Dos estaciones separadas por pocos kilómetros pueden mostrar precios distintos el mismo día. No hay una única causa: el importe final combina costes comunes con decisiones propias de cada establecimiento.</p>
    <div className="factor-list">
      <section><span>01</span><div><h2>Coste del carburante</h2><p>La materia prima y su transformación condicionan la base del precio. Los movimientos internacionales no siempre llegan inmediatamente al surtidor ni con la misma intensidad.</p></div></section>
      <section><span>02</span><div><h2>Impuestos</h2><p>Los impuestos representan una parte relevante del precio final y se aplican con reglas comunes. Por sí solos no explican la diferencia entre dos estaciones cercanas.</p></div></section>
      <section><span>03</span><div><h2>Ubicación y costes</h2><p>El alquiler o propiedad del terreno, la logística, el personal, los horarios y los servicios disponibles influyen en los costes de cada estación.</p></div></section>
      <section><span>04</span><div><h2>Competencia y estrategia</h2><p>Una estación puede trabajar con márgenes más ajustados, automatizar servicios o utilizar el combustible para atraer clientes a otros negocios.</p></div></section>
    </div>
    <h2>El precio más conocido no siempre es el mejor</h2>
    <p>Las estaciones de una misma marca tampoco tienen por qué mostrar exactamente el mismo importe. Antes de repostar, lo más fiable es consultar precios actuales de establecimientos concretos.</p>
    <div className="article-callout"><strong>Precios oficiales y comparables</strong><p>GasolinaGo muestra los precios comunicados por las estaciones y publicados por el Ministerio para la Transición Ecológica. Indicamos la fecha de actualización para que sepas qué estás comparando.</p><Link href="/gasolineras">Consultar ciudades →</Link></div>
  </>;
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();
  const jsonLd = {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title,
    description: post.excerpt, datePublished: post.publishedAt, dateModified: post.publishedAt,
    author: { "@type": "Organization", name: "GasolinaGo" }, publisher: { "@type": "Organization", name: "GasolinaGo" },
    mainEntityOfPage: `https://www.gasolinago.com/blog/${post.slug}`,
  };

  return <main className="article-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <header className="blog-topbar">
      <Link href="/" className="brand" aria-label="GasolinaGo, inicio"><span className="brand-mark">G</span><span>Gasolina<strong>Go</strong></span></Link>
      <nav aria-label="Navegación principal"><Link href="/">Radar</Link><Link href="/gasolineras">Ciudades</Link><Link href="/observatorio">Datos</Link><Link href="/blog">Blog</Link></nav>
    </header>
    <nav className="article-breadcrumbs" aria-label="Migas de pan"><Link href="/blog">Observatorio</Link><span>/</span><strong>{post.category}</strong></nav>
    <article>
      <header className="article-header"><span className="article-tag">{post.category}</span><h1>{post.title}</h1><p>{post.excerpt}</p><div className="article-byline"><div><span>Por Equipo GasolinaGo</span><span>{formatBlogDate(post.publishedAt)} · {post.readingTime}</span></div><ShareButton title={post.title} /></div></header>
      <div className="article-body">
        {slug === "evolucion-gasolina-95-ultimos-30-dias" && <ObservatoryArticle />}
        {slug === "cuanto-puedes-ahorrar-comparando-gasolineras" && <SavingsArticle />}
        {slug === "por-que-cambia-precio-gasolina" && <PriceFactorsArticle />}
      </div>
      <footer className="article-end"><p className="eyebrow">Siguiente paso</p><h2>Comprueba el precio<br />antes de salir.</h2><Link href="/">Abrir GasolinaGo <span aria-hidden="true">→</span></Link></footer>
    </article>
    <footer className="blog-footer"><span>GasolinaGo · Proyecto de datos abiertos</span><span><Link href="/blog">Más artículos</Link> · <Link href="/privacidad">Privacidad</Link></span></footer>
  </main>;
}
