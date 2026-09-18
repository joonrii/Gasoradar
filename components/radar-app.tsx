"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { StationDetail } from "@/components/station-detail";
import { track } from "@/lib/analytics";
import { SEO_LOCATIONS, type SeoLocation } from "@/lib/locations";
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
type HistoryPoint = { date: string; fuels: Record<FuelKey, { min: number; average: number; count: number } | null> };
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function distanceKm(from: Point, station: Station) {
  const radius = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(station.lat - from.lat);
  const deltaLng = toRadians(station.lng - from.lng);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(station.lat)) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatPrice(value: number | null) {
  return value === null ? "—" : value.toFixed(3).replace(".", ",");
}

async function fetchStations(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("No se pudo cargar la fuente de precios");
  return response.json() as Promise<StationsResponse>;
}

export function RadarApp({ initialCity = null }: { initialCity?: { city: string; province: string } | null }) {
  const initialLocation = initialCity ? SEO_LOCATIONS.find((item) => item.city === initialCity.city && item.province === initialCity.province) ?? null : null;
  const [data, setData] = useState<StationsResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(initialLocation));
  const [error, setError] = useState<string | null>(null);
  const [fuel, setFuel] = useState<FuelKey>("g95");
  const [query, setQuery] = useState(initialLocation?.displayName ?? "");
  const [location, setLocation] = useState<SeoLocation | null>(initialLocation);
  const [radius, setRadius] = useState(10);
  const [selected, setSelected] = useState<Station | null>(null);
  const [userPosition, setUserPosition] = useState<Point | null>(null);
  const [center, setCenter] = useState<Point | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<SeoLocation[]>([]);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const requestIdRef = useRef(0);

  const loadLocation = useCallback(async (nextLocation: SeoLocation) => {
    const requestId = ++requestIdRef.current;
    setLoading(true); setError(null); setData(null); setHistory([]);
    try {
      const [payload, historyResponse, geocodeResponse] = await Promise.all([
        fetchStations(`/api/stations?province=${nextLocation.provinceId}&provinceName=${encodeURIComponent(nextLocation.province)}`),
        fetch(`/api/history?city=${encodeURIComponent(nextLocation.city)}&province=${encodeURIComponent(nextLocation.province)}`),
        fetch(`/api/geocode?city=${encodeURIComponent(nextLocation.city)}&province=${encodeURIComponent(nextLocation.province)}`),
      ]);
      if (requestId !== requestIdRef.current) return;
      const cityStations = payload.stations.filter((station) => station.city === nextLocation.city);
      const geocode = geocodeResponse.ok ? (await geocodeResponse.json()) as { point: Point | null } : { point: null };
      const anchor = cityStations.length ? {
        lat: cityStations.reduce((sum, station) => sum + station.lat, 0) / cityStations.length,
        lng: cityStations.reduce((sum, station) => sum + station.lng, 0) / cityStations.length,
      } : nextLocation.center ?? geocode.point ?? (payload.stations[0] ? { lat: payload.stations[0].lat, lng: payload.stations[0].lng } : null);
      setCenter(anchor); setData(payload);
      if (historyResponse.ok) setHistory(((await historyResponse.json()) as { points: HistoryPoint[] }).points);
      track("search_city", { ciudad: nextLocation.displayName, territorio: nextLocation.province });
    } catch (reason) {
      if (requestId === requestIdRef.current) setError(reason instanceof Error ? reason.message : "No se pudieron cargar las estaciones");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLocation) return;
    const timer = window.setTimeout(() => void loadLocation(initialLocation), 0);
    return () => window.clearTimeout(timer);
  }, [initialLocation, loadLocation]);

  useEffect(() => {
    if (normalize(query).length < 2 || location?.displayName === query || query === "Mi ubicación") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/locations?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ locations: SeoLocation[] }>)
        .then((payload) => setLocationSuggestions(payload.locations))
        .catch((reason: Error) => { if (reason.name !== "AbortError") setLocationSuggestions([]); });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [location, query]);

  const visibleStations = useMemo(() => {
    if (!data || !center) return [];
    return data.stations.filter((station) => station[fuel] !== null && distanceKm(center, station) <= radius);
  }, [center, data, fuel, radius]);

  const rankedStations = useMemo(() => [...visibleStations].sort((a, b) => {
    const priceDifference = (a[fuel] ?? Infinity) - (b[fuel] ?? Infinity);
    return priceDifference || (center ? distanceKm(center, a) - distanceKm(center, b) : 0);
  }), [center, fuel, visibleStations]);

  const average = useMemo(() => {
    const prices = visibleStations.map((station) => station[fuel]).filter((price): price is number => price !== null);
    return prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
  }, [fuel, visibleStations]);

  const chooseLocation = useCallback((nextLocation: SeoLocation) => {
    setLocation(nextLocation); setQuery(nextLocation.displayName); setSelected(null); setUserPosition(null); setLocationMessage(null); setMobileView("list");
    void loadLocation(nextLocation);
  }, [loadLocation]);

  const selectStation = useCallback((station: Station) => {
    setSelected(station);
    setMobileView("map");
    track("station_view", { station_id: station.id, territorio: station.province, combustible: fuel });
  }, [fuel]);

  function chooseFuel(nextFuel: FuelKey) { setFuel(nextFuel); setSelected(null); track("fuel_change", { combustible: nextFuel }); }
  function changeRadius(nextRadius: number) { setRadius(nextRadius); setSelected(null); track("radius_change", { radio_km: nextRadius }); }

  function requestLocation() {
    if (!navigator.geolocation) return setLocationMessage("Tu navegador no permite usar la ubicación.");
    setLocationMessage("Buscando tu posición…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const point = { lat: coords.latitude, lng: coords.longitude };
      setUserPosition(point); setCenter(point); setLoading(true); setError(null);
      try {
        const payload = await fetchStations("/api/stations");
        setData(payload); setLocation(null); setQuery("Mi ubicación"); setHistory([]);
        setLocationMessage("Mostrando las estaciones más cercanas a ti.");
        track("location_enabled");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "No se pudo cargar tu zona");
      } finally { setLoading(false); }
    }, () => setLocationMessage("No pudimos obtener tu ubicación. Busca una ciudad."), { enableHighAccuracy: false, timeout: 10000 });
  }

  const cheapest = rankedStations[0]?.[fuel] ?? null;
  const savings = cheapest !== null && average ? Math.max(0, (average - cheapest) * 50) : 0;
  const selectedDistance = selected && center ? distanceKm(center, selected) : null;

  return (
    <main className="app-shell local-app">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="GasolinaGo, inicio"><span className="brand-mark">G</span><span>Gasolina<strong>Go</strong></span></Link>
        <div className="live-status"><i /><span>Precios oficiales actualizados</span></div>
        <nav className="topnav" aria-label="Navegación principal"><Link href="/gasolineras">Ciudades</Link><Link href="/privacidad">Privacidad</Link></nav>
      </header>

      <section className="local-hero">
        <div><p className="eyebrow">Compara antes de repostar</p><h1>La gasolina barata,<br /><em>cerca de ti.</em></h1></div>
        <p>Encuentra en segundos las estaciones con mejor precio de tu ciudad y calcula cuánto puedes ahorrar.</p>
      </section>

      <section className="local-search" aria-label="Buscar gasolineras">
        <div className="search-wrap city-search">
          <span className="search-logo" aria-hidden="true">G</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value !== location?.displayName) setLocation(null); }} placeholder="Busca tu ciudad" aria-label="Buscar ciudad" autoComplete="off" />
          {query && <button onClick={() => { setQuery(""); setLocation(null); setData(null); setCenter(null); }} aria-label="Limpiar búsqueda">×</button>}
          {location?.displayName !== query && locationSuggestions.length > 0 && <div className="suggestions">{locationSuggestions.map((item) => <button key={`${item.provinceId}-${item.citySlug}`} onClick={() => chooseLocation(item)}><span>{item.displayName}</span><small>{item.province}</small></button>)}</div>}
        </div>
        <button className="location-button" onClick={requestLocation} disabled={loading}><span>◎</span>{loading ? "Buscando…" : "Usar mi ubicación"}</button>
        <div className="fuel-switch" aria-label="Tipo de combustible">{fuelOptions.map((option) => <button key={option.key} className={fuel === option.key ? "active" : ""} onClick={() => chooseFuel(option.key)} title={option.name}><span>{option.short}</span>{option.name}</button>)}</div>
      </section>

      {!data && !loading && <section className="popular-cities"><span>Empieza por una ciudad popular</span><div>{SEO_LOCATIONS.slice(0, 12).map((item) => <button key={item.citySlug} onClick={() => chooseLocation(item)}>{item.displayName}<b>→</b></button>)}</div></section>}
      {locationMessage && <p className="location-message">{locationMessage}</p>}
      {error && <p className="error-banner" role="alert">{error}</p>}

      {(data || loading) && <>
        <section className="result-summary">
          <div className="result-title"><p className="eyebrow">{location?.displayName ?? (userPosition ? "Cerca de ti" : "Resultados anteriores")} · radio de {radius} km</p><h2>{loading ? "Buscando los mejores precios…" : `${visibleStations.length} estaciones encontradas`}</h2></div>
          <div><span>Desde</span><strong>{formatPrice(cheapest)}<small> €/L</small></strong></div>
          <div><span>Media</span><strong>{formatPrice(average || null)}<small> €/L</small></strong></div>
          <div className="saving-stat"><span>Ahorro por depósito*</span><strong>{savings.toFixed(2).replace(".", ",")} €</strong></div>
        </section>

        <div className="local-toolbar">
          <div><span>Distancia</span>{[5, 10, 20, 30].map((value) => <button key={value} className={radius === value ? "active" : ""} onClick={() => changeRadius(value)}>{value} km</button>)}</div>
          <div className="mobile-view-switch"><button className={mobileView === "list" ? "active" : ""} onClick={() => setMobileView("list")}>Lista</button><button className={mobileView === "map" ? "active" : ""} onClick={() => setMobileView("map")}>Mapa</button></div>
        </div>

        <section className={`local-workspace show-${mobileView}`}>
          <div className="local-results">
            <div className="local-results-heading"><div><p className="eyebrow">Ordenadas por precio</p><h2>Las mejores opciones</h2></div><span>Precio oficial · €/L</span></div>
            <div className="station-list">
              {loading && Array.from({ length: 6 }).map((_, index) => <div className="station-skeleton" key={index} />)}
              {!loading && rankedStations.length === 0 && <div className="empty-state"><strong>No hay precios para este filtro.</strong><span>Prueba con otro combustible o amplía el radio.</span></div>}
              {rankedStations.slice(0, 30).map((station, index) => {
                const distance = center ? distanceKm(center, station) : null;
                const stationPrice = station[fuel];
                const stationSaving = stationPrice !== null && average ? Math.max(0, (average - stationPrice) * 50) : 0;
                return <button className={`station-card${index < 3 ? ` podium-card podium-${index + 1}` : ""}${selected?.id === station.id ? " selected" : ""}`} key={station.id} onClick={() => selectStation(station)}>
                  <span className={`rank${index < 3 ? " podium-rank" : ""}`}>{index < 3 ? <><b>{index + 1}</b><small>{["Oro", "Plata", "Bronce"][index]}</small></> : String(index + 1).padStart(2, "0")}</span>
                  <span className="station-main"><strong>{station.brand}</strong><small>{station.address} · {station.city}</small><em>{distance === null ? station.province : `${distance.toFixed(1).replace(".", ",")} km · Ahorras ${stationSaving.toFixed(2).replace(".", ",")} €*`}</em></span>
                  <span className="station-price">{formatPrice(stationPrice)}<small>€/L</small></span>
                </button>;
              })}
            </div>
          </div>
          <div className="local-map-panel">
            <RadarMap stations={rankedStations.slice(0, 80)} featuredIds={rankedStations.slice(0, 3).map((station) => station.id)} fuel={fuel} selectedId={selected?.id ?? null} userPosition={userPosition} focus={selected ? { lat: selected.lat, lng: selected.lng } : center} onSelect={selectStation} />
            <div className="map-key"><span className="price-scale"><b><i className="cheap" />Barato</b><b><i className="average" />Medio</b><b><i className="high" />Alto</b></span><span>Mostramos hasta 80 estaciones cercanas</span></div>
            {selected && <StationDetail station={selected} fuel={fuel} average={average} distance={selectedDistance} onClose={() => setSelected(null)} />}
          </div>
        </section>

        {!loading && location && <PriceHistoryChart points={history} fuel={fuel} place={location.displayName} province={location.province} />}
        <p className="saving-note">* Ahorro estimado frente al precio medio visible para un depósito de 50 litros.</p>
      </>}

      <footer className="site-footer"><span>GasolinaGo · Proyecto de datos abiertos</span><span><Link href="/gasolineras">Precios por ciudad</Link> · Ministerio · OpenStreetMap</span></footer>
    </main>
  );
}
