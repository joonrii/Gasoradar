import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookies y privacidad",
  description: "Cómo utiliza GasolinaGo la analítica opcional, la ubicación y los datos abiertos.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="back-link">← Volver al radar</Link>
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
        Si autorizas tu ubicación, las coordenadas se usan en tu navegador para ordenar estaciones por distancia y no se
        guardan en una base de datos de GasolinaGo. El proveedor cartográfico recibe los datos técnicos habituales de una
        petición web y el área de mapa solicitada.
      </p>
      <h2>Proveedores</h2>
      <p>
        El proyecto utiliza Vercel para el alojamiento, CARTO y OpenStreetMap para la cartografía y Google Analytics si
        das tu consentimiento. Puedes cambiar tu decisión desde el aviso de privacidad de la página principal.
      </p>
    </main>
  );
}
