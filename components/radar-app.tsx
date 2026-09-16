"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { StationDetail } from "@/components/station-detail";
import { track } from "@/lib/analytics";
import type { FuelKey, Station, StationsResponse } from "@/lib/types";

const RadarMap = dynamic(() => import("@/components/radar-map").then((module) => module.RadarMap), {
  ssr: false,
  loading: () => <div className="map-loading">Preparando el mapa…</div>,
});

const fuelOptions: Array<{ key: FuelKey; short: string; name: string }> = [
  { key: "g95", short: "95", name: "Gasolina 95" },
  { key: "g98", short: "98", name: "Gasolina 98" },
  { key: "diesel", short: "A", name: "Diésel A" },
  { key: "dieselPlus", short: "A+", name: "Diésel premium" },
];

type Point = { lat: number; lng: number };

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function distanceKm(from: Point, station: Station) {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(station.lat - from.lat);
  const deltaLng = toRadians(station.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(station.lat);
  const value =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatPrice(value: number | null) {
  return value === null ? "—" : value.toFixed(3).replace(".", ",");
}

export function RadarApp() {
  const [data, setData] = useState<StationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fuel, setFuel] = useState<FuelKey>("g95");
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<{ city: string; province: string } | null>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [userPosition, setUserPosition] = useState<Point | null>(null);
  const [focus, setFocus] = useState<Point | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stations")
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar la fuente de precios");
        return response.json() as Promise<StationsResponse>;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
        track("radar_open", { station_count: payload.total, source: payload.source });
      })
      .catch((reason: Error) => active && setError(reason.message));
    return () => {
      active = false;
    };
  }, []);

  const visibleStations = useMemo(() => {
    if (!data) return [];
    const terms = normalize(query).split(" ").filter(Boolean);
    return data.stations.filter((station) => {
      if (station[fuel] === null) return false;
      if (selectedCity) return station.city === selectedCity.city && station.province === selectedCity.province;
      if (!terms.length) return true;
      const searchable = normalize(`${station.brand} ${station.city} ${station.province} ${station.address}`);
      return terms.every((term) => searchable.includes(term));
    });
  }, [data, fuel, query, selectedCity]);

  const rankedStations = useMemo(() => {
    return [...visibleStations]
      .sort((a, b) => {
        if (userPosition) return distanceKm(userPosition, a) - distanceKm(userPosition, b);
        return (a[fuel] ?? Number.POSITIVE_INFINITY) - (b[fuel] ?? Number.POSITIVE_INFINITY);
      })
      .slice(0, 40);
  }, [fuel, userPosition, visibleStations]);

  const average = useMemo(() => {
    const prices = visibleStations.map((station) => station[fuel]).filter((price): price is number => price !== null);
    return prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
  }, [fuel, visibleStations]);

  const suggestions = useMemo(() => {
    if (!data || selectedCity || query.trim().length < 2) return [];
    const needle = normalize(query);
    const unique = new Map<string, Station>();
    for (const station of data.stations) {
      const label = `${station.city}, ${station.province}`;
      if (!normalize(label).includes(needle) || unique.has(label)) continue;
      unique.set(label, station);
      if (unique.size === 6) break;
    }
    return [...unique.entries()];
  }, [data, query, selectedCity]);

  const selectStation = useCallback((station: Station) => {
    setSelected(station);
    setFocus({ lat: station.lat, lng: station.lng });
    track("station_view", { station_id: station.id, territorio: station.province, combustible: fuel });
  }, [fuel]);

  function chooseFuel(nextFuel: FuelKey) {
    setFuel(nextFuel);
    setSelected(null);
    track("fuel_change", { combustible: nextFuel });
  }

  function chooseSuggestion(label: string, station: Station) {
    setQuery(label);
    setSelectedCity({ city: station.city, province: station.province });
    setFocus({ lat: station.lat, lng: station.lng });
    track("search_city", { territorio: station.province });
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no permite usar la ubicación.");
      return;
    }
    setLocationMessage("Buscando tu posición…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        setUserPosition(point);
        setFocus(point);
        setLocationMessage("Ordenando por cercanía");
        track("location_enabled");
      },
      () => setLocationMessage("No se pudo obtener la ubicación. Puedes seguir buscando por ciudad."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  const cheapest = rankedStations[0]?.[fuel] ?? null;
  const selectedDistance = selected && userPosition ? distanceKm(userPosition, selected) : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="GasolinaGo, inicio">
          <span className="brand-mark">G</span>
          <span>Gasolina<strong>Go</strong></span>
        </Link>
        <div className="live-status">
          <i />
          <span>{data ? `${data.total.toLocaleString("es-ES")} estaciones` : "Conectando con datos oficiales"}</span>
        </div>
        <Link href="/privacidad" className="about-link">Privacidad</Link>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Radar de precios · España</p>
          <h1>Encuentra dónde<br /><em>repostar mejor.</em></h1>
        </div>
        <p className="intro-copy">
          Datos oficiales, sin registro y con una decisión clara: comparar, elegir y abrir la ruta.
        </p>
      </section>

      <section className="control-panel" aria-label="Filtros del radar">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedCity(null);
            }}
            placeholder="Ciudad, provincia o gasolinera"
            aria-label="Buscar ciudad, provincia o gasolinera"
          />
          {query && <button onClick={() => { setQuery(""); setSelectedCity(null); }} aria-label="Limpiar búsqueda">×</button>}
          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map(([label, station]) => (
                <button key={label} onClick={() => chooseSuggestion(label, station)}>
                  <span>{station.city}</span><small>{station.province}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="fuel-switch" aria-label="Tipo de combustible">
          {fuelOptions.map((option) => (
            <button
              key={option.key}
              className={fuel === option.key ? "active" : ""}
              onClick={() => chooseFuel(option.key)}
              title={option.name}
            >
              <span>{option.short}</span>{option.name}
            </button>
          ))}
        </div>
        <button className="location-button" onClick={requestLocation}>
          <span>◎</span>{userPosition ? "Ubicación activa" : "Usar mi ubicación"}
        </button>
      </section>

      {locationMessage && <p className="location-message">{locationMessage}</p>}
      {error && <p className="error-banner">{error}</p>}

      <section className="stats-strip" aria-label="Resumen de resultados">
        <div><span>Resultados</span><strong>{visibleStations.length.toLocaleString("es-ES")}</strong></div>
        <div><span>Más barata</span><strong>{formatPrice(cheapest)}<small> €/L</small></strong></div>
        <div><span>Media visible</span><strong>{formatPrice(average || null)}<small> €/L</small></strong></div>
        <div className="source-stat"><span>Fuente</span><strong>{data?.source === "fallback" ? "Copia de respaldo" : "Ministerio"}</strong></div>
      </section>

      <section className="workspace">
        <div className="results-panel">
          <div className="results-heading">
            <div>
              <p className="eyebrow">{userPosition ? "Cerca de ti" : "Mejor precio"}</p>
              <h2>{query ? `Resultados para “${query}”` : "Estaciones destacadas"}</h2>
            </div>
            <span>{rankedStations.length > 0 ? `Mostrando ${rankedStations.length}` : "Sin resultados"}</span>
          </div>
          <div className="station-list">
            {!data && Array.from({ length: 6 }).map((_, index) => <div className="station-skeleton" key={index} />)}
            {data && rankedStations.length === 0 && (
              <div className="empty-state"><strong>No encontramos coincidencias.</strong><span>Prueba con otra ciudad o combustible.</span></div>
            )}
            {rankedStations.map((station, index) => {
              const distance = userPosition ? distanceKm(userPosition, station) : null;
              const price = station[fuel];
              return (
                <button
                  className={`station-card${selected?.id === station.id ? " selected" : ""}`}
                  key={station.id}
                  onClick={() => selectStation(station)}
                >
                  <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="station-main">
                    <strong>{station.brand}</strong>
                    <small>{station.city} · {station.province}</small>
                    <em>{distance === null ? station.address : `${distance.toFixed(1).replace(".", ",")} km de ti`}</em>
                  </span>
                  <span className="station-price">{formatPrice(price)}<small>€/L</small></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="map-panel">
          <RadarMap
            stations={visibleStations}
            fuel={fuel}
            selectedId={selected?.id ?? null}
            userPosition={userPosition}
            focus={focus}
            onSelect={selectStation}
          />
          <div className="map-key"><span><i className="cheap" /> Precio por litro</span><span>Amplía el mapa para ver estaciones</span></div>
          {selected && (
            <StationDetail
              station={selected}
              fuel={fuel}
              average={average}
              distance={selectedDistance}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </section>

      <footer className="site-footer">
        <span>GasolinaGo · Proyecto de datos abiertos</span>
        <span>Precios del Ministerio · Mapa OpenStreetMap</span>
      </footer>
      <AnalyticsConsent
        onAccept={() => {
          if (data) track("radar_open", { station_count: data.total, source: data.source });
        }}
      />
    </main>
  );
}
