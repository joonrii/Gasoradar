"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/analytics";

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<"yes" | "no" | null | undefined>(undefined);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    queueMicrotask(() => setConsent(saved === "yes" || saved === "no" ? saved : null));
  }, []);

  function choose(value: "yes" | "no") {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    if (value === "yes") window.dispatchEvent(new Event("gasolinago:consent-granted"));
  }

  return (
    <>
      {consent === "yes" && <GoogleAnalytics gaId="G-SFYS4R2W31" />}
      {consent === null && (
        <aside className="consent" aria-label="Preferencias de analítica">
          <div>
            <strong>¿Nos ayudas a mejorar el radar?</strong>
            <p>La analítica es opcional. No enviamos tu ubicación ni búsquedas de texto libre.</p>
            <Link href="/privacidad">Ver privacidad</Link>
          </div>
          <div className="consent-actions">
            <button onClick={() => choose("no")} className="button ghost">Rechazar</button>
            <button onClick={() => choose("yes")} className="button primary">Aceptar</button>
          </div>
        </aside>
      )}
    </>
  );
}
