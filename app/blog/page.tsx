import type { Metadata } from "next";
import Link from "next/link";
import { BlogPriceChart } from "@/components/blog-price-chart";
import { BLOG_POSTS, formatBlogDate } from "@/lib/blog";
import { getG95ThirtyDayInsight } from "@/lib/observatory";

export const metadata: Metadata = {
  title: "Blog y Observatorio del precio de la gasolina",
  description: "Análisis con datos reales, gráficos y guías para entender el precio de la gasolina y ahorrar al repostar.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Observatorio GasolinaGo",
    description: "Datos y guías para repostar con más criterio.",
    url: "/blog",
    type: "website",
    locale: "es_ES",
  },
};

export default function BlogPage() {
  const featured = BLOG_POSTS.find((post) => post.featured) ?? BLOG_POSTS[0];
  const others = BLOG_POSTS.filter((post) => post.slug !== featured.slug);
  const insight = getG95ThirtyDayInsight();
  const direction = insight.change >= 0 ? "sube" : "baja";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Observatorio GasolinaGo",
    url: "https://www.gasolinago.com/blog",
    description: "Análisis y guías sobre el precio de los carburantes en España.",
    blogPost: BLOG_POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      datePublished: post.publishedAt,
      url: `https://www.gasolinago.com/blog/${post.slug}`,
    })),
  };

  return (
    <main className="blog-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="blog-topbar">
        <Link href="/" className="brand" aria-label="GasolinaGo, inicio"><span className="brand-mark">G</span><span>Gasolina<strong>Go</strong></span></Link>
        <nav aria-label="Navegación principal"><Link href="/">Radar</Link><Link href="/gasolineras">Ciudades</Link><Link href="/blog" aria-current="page">Blog</Link></nav>
      </header>

      <section className="blog-hero">
        <div><p className="eyebrow">Datos para conducir mejor</p><h1>Observatorio<br /><em>GasolinaGo.</em></h1></div>
        <p>Análisis claros, gráficos reales y consejos prácticos para entender los precios y pagar menos al repostar.</p>
      </section>

      <Link href={`/blog/${featured.slug}`} className="featured-story">
        <div className="featured-copy">
          <span className="article-tag">{featured.category} · Nuevo</span>
          <h2>{featured.title}</h2>
          <p>{featured.excerpt}</p>
          <div className="article-meta"><span>{formatBlogDate(featured.publishedAt)}</span><span>{featured.readingTime} de lectura</span></div>
          <strong>Leer el análisis <b aria-hidden="true">→</b></strong>
        </div>
        <div className="featured-data" aria-label="Resumen del análisis">
          <div><span>Variación en 30 días</span><strong>{insight.change >= 0 ? "+" : ""}{insight.change.toFixed(3).replace(".", ",")}<small> €/L</small></strong><em>{direction} un {Math.abs(insight.changePercent).toFixed(1).replace(".", ",")}%</em></div>
          <BlogPriceChart points={insight.points} compact />
        </div>
      </Link>

      <section className="blog-latest">
        <div className="blog-section-title"><div><p className="eyebrow">Últimas publicaciones</p><h2>Ideas que se traducen en ahorro.</h2></div><p>Publicamos análisis de precios y explicamos el mundo del carburante sin jerga innecesaria.</p></div>
        <div className="story-grid">
          {others.map((post, index) => <Link href={`/blog/${post.slug}`} className={`story-card story-${index + 1}`} key={post.slug}>
            <div className="story-number">0{index + 2}</div>
            <span className="article-tag">{post.category}</span>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <div className="article-meta"><span>{formatBlogDate(post.publishedAt)}</span><span>{post.readingTime}</span></div>
            <strong>Leer artículo <b aria-hidden="true">→</b></strong>
          </Link>)}
        </div>
      </section>

      <section className="blog-promise"><p className="eyebrow">Nuestra forma de trabajar</p><h2>Datos primero.<br />Opiniones, las justas.</h2><p>Indicamos siempre el periodo analizado, la cobertura disponible y la fuente. Si los datos no permiten una conclusión, también lo contamos.</p></section>
      <footer className="blog-footer"><span>GasolinaGo · Proyecto de datos abiertos</span><span><Link href="/">Abrir el radar</Link> · <Link href="/privacidad">Privacidad</Link></span></footer>
    </main>
  );
}

