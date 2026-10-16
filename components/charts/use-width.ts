"use client";

import { useEffect, useRef, useState } from "react";

// Ancho real del contenedor para dibujar el SVG a su tamaño (texto nítido).
// En el servidor se usa `fallback`; el SVG escala con viewBox hasta medir.
export function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
