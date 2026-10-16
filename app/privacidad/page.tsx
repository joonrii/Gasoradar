import type { Metadata } from "next";
import Link from "next/link";
import { Ambient, SiteFooter, SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Cookies y privacidad",
  description: "Cómo utiliza GasolinaGo la analítica opcional, la ubicación y los datos abiertos.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return <>
    <Ambient />
    <SiteHeader />
    <main className="legal-page">
      <Link href="/" className="back-link">← Volver al inicio</Link>
      <p className="eyebrow">Transparencia</p>
      <h1>Cookies y privacidad</h1>
      <p>
        GasolinaGo usa datos abiertos del Ministerio para la Transición Ecológica para mostrar precios de carburantes.
        No necesitas crear una cuenta ni facilitar datos personales para utilizar el comparador.
      </p>
      <h2>Analítica opcional</h2>
      <p>
        Google Analytics 4 solo se carga si aceptas la analítica. Se utiliza para medir visitas e interacciones de forma
        agregada y mejorar el producto. No se envían coordenadas, direcciones introducidas ni búsquedas de texto libre.
      </p>
      <h2>Ubicación</h2>
      <p>
        Si autorizas tu ubicación, tu navegador envía a nuestro servidor las coordenadas redondeadas a unos 1 km para pedir
        solo las gasolineras de las provincias cercanas. No se guardan en ninguna base de datos de GasolinaGo. El proveedor
        cartográfico recibe los datos técnicos habituales de una petición web y el área de mapa solicitada.
      </p>
      <p>
        Sin pedirte permiso, la portada muestra la ciudad más cercana a tu zona aproximada. Esa zona (a nivel de ciudad) la
        deduce nuestro proveedor de alojamiento, Vercel, a partir de la dirección IP de la conexión. Solo se usa para elegir
        qué ciudad mostrar y no se guarda.
      </p>
      <h2>Proveedores</h2>
      <p>
        El proyecto utiliza Vercel para el alojamiento, CARTO y OpenStreetMap para la cartografía y Google Analytics si
        das tu consentimiento. Puedes cambiar tu decisión desde el aviso de privacidad de la página principal.
      </p>
    </main>
    <SiteFooter />
  </>;
}
