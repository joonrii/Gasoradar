"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import type { SeoLocation } from "@/lib/locations";

type Result = SeoLocation & { path?: string };

// Buscador de la portada: lleva a la página de la ciudad si existe y, si no,
// a "Cerca de mí" centrado en ese municipio.
export function CitySearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/locations?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ locations: Result[] }>)
        .then((payload) => { setResults(payload.locations); setOpen(true); })
        .catch(() => {});
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function go(location: Result) {
    track("search_city", { ciudad: location.displayName, territorio: location.province, origen: "portada" });
    setOpen(false);
    router.push(location.path ?? `/cerca?ciudad=${encodeURIComponent(location.city)}&provincia=${encodeURIComponent(location.province)}`);
  }

  return (
    <div className="city-search-box">
      <label htmlFor="home-search" className="sr-only">Buscar ciudad</label>
      <input
        id="home-search"
        value={query}
        onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 2) { setResults([]); setOpen(false); } }}
        onKeyDown={(event) => { if (event.key === "Enter" && results[0]) go(results[0]); if (event.key === "Escape") setOpen(false); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Busca tu ciudad"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="home-search-list"
      />
      {open ? (
        <div className="city-suggest" id="home-search-list" role="listbox">
          {results.length ? results.map((item) => (
            <button type="button" role="option" aria-selected={false} key={`${item.provinceId}-${item.citySlug}`} onMouseDown={(event) => event.preventDefault()} onClick={() => go(item)}>
              <b>{item.displayName}</b><span>{item.province}</span>
            </button>
          )) : <p>No encontramos ese municipio. Prueba con otro nombre.</p>}
        </div>
      ) : null}
    </div>
  );
}
