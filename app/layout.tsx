import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from "next/font/google";
import { AnalyticsConsent } from "@/components/analytics-consent";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.gasolinago.com"),
  title: {
    default: "GasolinaGo — Gasolineras baratas cerca de ti",
    template: "%s | GasolinaGo",
  },
  description:
    "Compara precios oficiales de gasolina y diésel en España, encuentra la estación más barata y abre la ruta para llegar.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "GasolinaGo — Reposta con criterio",
    description: "Precios oficiales de carburantes y estaciones cercanas en toda España.",
    url: "/",
    siteName: "GasolinaGo",
    type: "website",
    locale: "es_ES",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f2e8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <AnalyticsConsent />
      </body>
    </html>
  );
}
