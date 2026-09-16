"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StationDetail } from "@/components/station-detail";
import {
  COMMUNITIES,
  getCommunityByProvinceName,
  stationBelongsToCommunity,
  type Community,
} from "@/lib/communities";
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
type SelectionOrigin = "map" | "list" | "search" | "location";

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

async function fetchStations(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("No se pudo cargar la fuente de precios");
  return response.json() as Promise<StationsResponse>;
}

export function RadarApp({ initialCity = null }: { initialCity?: { city: string; province: string } | null }) {
  const initialCommunity = initialCity ? getCommunityByProvinceName(initialCity.province) : null;
  const [data, setData] = useState<StationsResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(initialCommunity));
  const [error, setError] = useState<string | null>(null);
  const [fuel, setFuel] = useState<FuelKey>("g95");
  const [regionQuery, setRegionQuery] = useState("");
  const [query, setQuery] = useState(initialCity ? `${initialCity.city}, ${initialCity.province}` : "");
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(initialCommunity);
  const [selectedCity, setSelectedCity] = useState<{ city: string; province: string } | null>(initialCity);
  const [selected, setSelected] = useState<Station | null>(null);
  const [userPosition, setUserPosition] = useState<Point | null>(null);
  const [focus, setFocus] = useState<Point | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadCommunity = useCallback(async (community: Community) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const payload = await fetchStations(`/api/stations?community=${community.slug}`);
      if (requestId !== requestIdRef.current) return;
      setData(payload);
      track("radar_open", {
        station_count: payload.total,
        source: payload.source,
        comunidad: community.slug,
      });
    } catch (reason) {
      if (requestId !== requestIdRef.current) return;
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar las estaciones");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCommunity) return;
    const requestId = ++requestIdRef.current;
    let active = true;
    fetchStations(`/api/stations?community=${initialCommunity.slug}`)
      .then((payload) => {
        if (!active || requestId !== requestIdRef.current) return;
        setData(payload);
        track("radar_open", {
          station_count: payload.total,
          source: payload.source,
          comunidad: initialCommunity.slug,
        });
      })
      .catch((reason: Error) => {
        if (active && requestId === requestIdRef.current) setError(reason.message);
      })
      .finally(() => {
        if (active && requestId === requestIdRef.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialCommunity]);

  useEffect(() => {
    const reportOpen = () => {
      if (data && selectedCommunity) {
        track("radar_open", {
          station_count: data.total,
          source: data.source,
          comunidad: selectedCommunity.slug,
        });
      }
    };
    window.addEventListener("gasolinago:consent-granted", reportOpen);
    return () => window.removeEventListener("gasolinago:consent-granted", reportOpen);
  }, [data, selectedCommunity]);

  const chooseCommunity = useCallback((community: Community, origin: SelectionOrigin = "list") => {
    setSelectedCommunity(community);
    setSelectedCity(null);
    setSelected(null);
    setFocus(null);
    setQuery("");
    setRegionQuery("");
    setLocationMessage(null);
    track("community_select", { comunidad: community.slug, origin });
    void loadCommunity(community);
  }, [loadCommunity]);

  const filteredCommunities = useMemo(() => {
    const needle = normalize(regionQuery);
    if (!needle) return COMMUNITIES;
    return COMMUNITIES.filter((community) => normalize(`${community.name} ${community.shortName}`).includes(needle));
  }, [regionQuery]);

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

  const selectedCityFocus = useMemo(() => {
    if (!data || !selectedCity) return null;
    const firstStation = data.stations.find(
      (station) => station.city === selectedCity.city && station.province === selectedCity.province,
    );
    return firstStation ? { lat: firstStation.lat, lng: firstStation.lng } : null;
  }, [data, selectedCity]);

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

  function resetCommunity() {
    requestIdRef.current += 1;
    setSelectedCommunity(null);
    setSelectedCity(null);
    setSelected(null);
    setData(null);
    setQuery("");
    setFocus(null);
    setUserPosition(null);
    setLocationMessage(null);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no permite usar la ubicación.");
      return;
    }
    setLocationMessage("Buscando tu posición…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const requestId = ++requestIdRef.current;
        const point = { lat: coords.latitude, lng: coords.longitude };
        setLoading(true);
        setError(null);
        setUserPosition(point);
        setFocus(point);
        try {
          const payload = await fetchStations("/api/stations");
          if (requestId !== requestIdRef.current) return;
          let nearest = payload.stations[0];
          let nearestDistance = nearest ? distanceKm(point, nearest) : Number.POSITIVE_INFINITY;
          for (const station of payload.stations) {
            const distance = distanceKm(point, station);
            if (distance < nearestDistance) {
              nearest = station;
              nearestDistance = distance;
            }
          }
          const community = nearest ? getCommunityByProvinceName(nearest.province) : null;
          if (!community) throw new Error("No pudimos identificar tu comunidad");
          const regionalStations = payload.stations.filter((station) =>
            stationBelongsToCommunity(station.province, community),
          );
          setSelectedCommunity(community);
          setData({ ...payload, total: regionalStations.length, stations: regionalStations });
          setLocationMessage(`Mostrando ${community.shortName} y ordenando por cercanía`);
          track("location_enabled", { comunidad: community.slug });
          track("community_select", { comunidad: community.slug, origin: "location" });
        } catch (reason) {
          if (requestId !== requestIdRef.current) return;
          setError(reason instanceof Error ? reason.message : "No se pudo cargar tu zona");
          setLocationMessage("No se pudo obtener tu zona. Puedes elegirla en la lista.");
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      },
      () => setLocationMessage("No se pudo obtener la ubicación. Puedes elegir tu comunidad en la lista."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  const cheapest = rankedStations[0]?.[fuel] ?? null;
  const selectedDistance = selected && userPosition ? distanceKm(userPosition, selected) : null;

  return (
    <main className="app-shell regional-app">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="GasolinaGo, inicio">
          <span className="brand-mark">G</span>
          <span>Gasolina<strong>Go</strong></span>
        </Link>
        <div className="live-status">
          <i />
          <span>{selectedCommunity && data ? `${data.total.toLocaleString("es-ES")} estaciones en ${selectedCommunity.shortName}` : "Precios oficiales · España"}</span>
        </div>
        <nav className="topnav" aria-label="Navegación principal">
          <Link href="/gasolineras">Ciudades</Link>
          <Link href="/privacidad">Privacidad</Link>
        </nav>
      </header>

      <section className="regional-intro">
        <div>
          <p className="eyebrow">Explora por comunidad</p>
          <h2>Precios cerca de ti.</h2>
        </div>
        <p>Elige una comunidad para cargar solo sus estaciones, comparar precios y encontrar dónde repostar mejor.</p>
      </section>

      <section className="workspace regional-workspace">
        <aside className="results-panel regional-sidebar">
          {!selectedCommunity ? (
            <>
              <div className="region-selector-heading">
                <p className="eyebrow">Empieza por tu zona</p>
                <h1>Elige tu comunidad.</h1>
                <p>Selecciona en el mapa o utiliza la lista.</p>
              </div>
              <div className="region-controls">
                <div className="region-search">
                  <span aria-hidden="true">⌕</span>
                  <input
                    value={regionQuery}
                    onChange={(event) => setRegionQuery(event.target.value)}
                    placeholder="Buscar comunidad…"
                    aria-label="Buscar comunidad autónoma"
                  />
                </div>
                <button className="region-location" onClick={requestLocation} disabled={loading}>
                  <span aria-hidden="true">◎</span>{loading ? "Localizando…" : "Usar mi ubicación"}
                </button>
              </div>
              {locationMessage && <p className="region-message" aria-live="polite">{locationMessage}</p>}
              {error && <p className="error-banner" role="alert">{error}</p>}
              <div className="community-list" aria-label="Comunidades autónomas">
                {filteredCommunities.map((community) => (
                  <button key={community.code} onClick={() => chooseCommunity(community, regionQuery ? "search" : "list")}>
                    <span>{community.shortName}</span>
                    <small>{community.provinceIds.length === 1 ? "1 provincia" : `${community.provinceIds.length} provincias`}</small>
                    <b aria-hidden="true">→</b>
                  </button>
                ))}
                {filteredCommunities.length === 0 && <p className="community-empty">No encontramos esa comunidad.</p>}
              </div>
            </>
          ) : (
            <>
              <div className="selected-region-heading">
                <button onClick={resetCommunity}>← Cambiar comunidad</button>
                <p className="eyebrow">Radar regional</p>
                <h1>{selectedCommunity.shortName}</h1>
                <span>{loading ? "Cargando precios oficiales…" : `${data?.total.toLocaleString("es-ES") ?? 0} estaciones actualizadas`}</span>
              </div>

              <div className="regional-filters">
                <div className="search-wrap regional-station-search">
                  <span className="search-icon">⌕</span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedCity(null);
                    }}
                    placeholder="Ciudad o gasolinera"
                    aria-label="Buscar ciudad o gasolinera"
                  />
                  {query && <button onClick={() => { setQuery(""); setSelectedCity(null); setFocus(null); }} aria-label="Limpiar búsqueda">×</button>}
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
                <div className="fuel-switch regional-fuel-switch" aria-label="Tipo de combustible">
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
              </div>

              {locationMessage && <p className="region-message" aria-live="polite">{locationMessage}</p>}
              {error && <p className="error-banner" role="alert">{error}</p>}

              <div className="regional-stats" aria-label="Resumen de precios">
                <div><span>Resultados</span><strong>{visibleStations.length.toLocaleString("es-ES")}</strong></div>
                <div><span>Más barata</span><strong>{formatPrice(cheapest)}<small> €/L</small></strong></div>
                <div><span>Media</span><strong>{formatPrice(average || null)}<small> €/L</small></strong></div>
              </div>

              <div className="results-heading regional-results-heading">
                <div>
                  <p className="eyebrow">{userPosition ? "Cerca de ti" : "Mejor precio"}</p>
                  <h2>{query ? `Resultados para “${query}”` : "Estaciones destacadas"}</h2>
                </div>
                <span>{rankedStations.length ? `Top ${rankedStations.length}` : "Sin resultados"}</span>
              </div>
              <div className="station-list">
                {loading && Array.from({ length: 6 }).map((_, index) => <div className="station-skeleton" key={index} />)}
                {!loading && data && rankedStations.length === 0 && (
                  <div className="empty-state"><strong>No encontramos coincidencias.</strong><span>Prueba con otra ciudad o combustible.</span></div>
                )}
                {rankedStations.map((station, index) => {
                  const distance = userPosition ? distanceKm(userPosition, station) : null;
                  const stationPrice = station[fuel];
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
                      <span className="station-price">{formatPrice(stationPrice)}<small>€/L</small></span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        <div className="map-panel regional-map-panel">
          <RadarMap
            stations={selectedCommunity ? visibleStations : []}
            fuel={fuel}
            selectedId={selected?.id ?? null}
            userPosition={userPosition}
            focus={focus ?? selectedCityFocus}
            community={selectedCommunity}
            onCommunitySelect={(community) => chooseCommunity(community, "map")}
            onSelect={selectStation}
          />
          {!selectedCommunity && (
            <div className="map-prompt">
              <span>Mapa de España</span>
              <strong>Selecciona una comunidad</strong>
              <small>También puedes utilizar la lista de la izquierda.</small>
            </div>
          )}
          <div className="map-key">
            <span><i className="cheap" /> {selectedCommunity ? "Precio por litro" : "Comunidad seleccionable"}</span>
            <span>{selectedCommunity ? "Amplía el mapa para explorar" : "Haz clic sobre el mapa para empezar"}</span>
          </div>
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
        <span><Link href="/gasolineras">Precios por ciudad</Link> · Ministerio · OpenStreetMap</span>
      </footer>
    </main>
  );
}
