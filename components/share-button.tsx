"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

export function ShareButton({ title }: { title: string }) {
  const [label, setLabel] = useState("Compartir análisis");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setLabel("Enlace copiado");
        window.setTimeout(() => setLabel("Compartir análisis"), 1800);
      }
      track("share", { content_type: "blog_article", item_id: url });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLabel("No se pudo compartir");
    }
  }

  return <button type="button" className="blog-share" onClick={share}>{label}<span aria-hidden="true">↗</span></button>;
}

