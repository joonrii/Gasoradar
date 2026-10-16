import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/cerca", label: "Cerca de mí" },
  { href: "/gasolineras", label: "Ciudades" },
  { href: "/observatorio", label: "Datos" },
  { href: "/blog", label: "Blog" },
];

export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="gg-nav gg-glass">
      <Link href="/" className="gg-brand" aria-label="GasolinaGo, inicio">
        <span className="gg-logo" aria-hidden="true">G</span>
        <b>Gasolina<span>Go</span></b>
      </Link>
      <nav className="gg-tabs" aria-label="Navegación principal">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined} className={link.href === "/cerca" ? "gg-tab-cta" : undefined}>
            {link.label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="gg-footer">
      <div>
        <b>GasolinaGo</b>
        <p>Comparador gratuito de precios oficiales de carburante. Datos del Ministerio para la Transición Ecológica, actualizados cada día.</p>
      </div>
      <nav aria-label="Pie de página">
        <Link href="/cerca">Gasolineras cerca de mí</Link>
        <Link href="/gasolineras">Precios por ciudad</Link>
        <Link href="/observatorio">Observatorio</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/privacidad">Privacidad</Link>
      </nav>
    </footer>
  );
}

export function Ambient() {
  return <div className="gg-ambient" aria-hidden="true"><i /><i /><i /></div>;
}
