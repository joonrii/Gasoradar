import { ImageResponse } from "next/og";

export const alt = "GasolinaGo — compara precios de gasolina y diésel en España";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#171a17",
          background: "#f6f2e8",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 36, fontWeight: 800 }}>
          <div
            style={{
              width: 58,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50% 50% 50% 16px",
              color: "#f6f2e8",
              background: "#0c7a52",
            }}
          >
            G
          </div>
          <div style={{ display: "flex" }}>Gasolina<span style={{ color: "#0c7a52" }}>Go</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#0c7a52", fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
            Datos oficiales · España
          </div>
          <div style={{ marginTop: 18, fontSize: 86, fontWeight: 800, lineHeight: 0.92, letterSpacing: -5 }}>
            Reposta con criterio.
          </div>
          <div style={{ marginTop: 26, fontSize: 28, color: "#696d66" }}>
            Compara precios, encuentra la mejor estación y abre la ruta.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20 }}>
          <span>gasolinago.com</span>
          <span style={{ color: "#0c7a52", fontWeight: 700 }}>Gratis · Sin registro</span>
        </div>
      </div>
    ),
    size,
  );
}
