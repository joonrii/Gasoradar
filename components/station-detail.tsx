"use client";

import type { FuelKey, Station } from "@/lib/types";
import { track } from "@/lib/analytics";
import { StationPriceSparkline } from "@/components/station-price-sparkline";

const fuelNames: Record<FuelKey, string> = {
  g95: "Gasolina 95",
  g98: "Gasolina 98",
  diesel: "Diésel A",
  dieselPlus: "Diésel premium",
};

export function StationDetail({
  station,
  fuel,
  average,
  distance,
  onClose,
}: {
  station: Station;
  fuel: FuelKey;
  average: number;
  distance: number | null;
  onClose: () => void;
}) {
  const price = station[fuel];
  const difference = price === null || !average ? 0 : ((price - average) / average) * 100;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <aside className="station-detail" aria-label={`Detalle de ${station.brand}`}>
      <button className="detail-close" onClick={onClose} aria-label="Cerrar detalle">×</button>
      <p className="eyebrow">Estación seleccionada</p>
      <h2>{station.brand}</h2>
      <p className="detail-address">{station.address}<br />{station.city}, {station.province}</p>

      <div className="detail-price-row">
        <div className="detail-price-copy">
          <div className="detail-price-heading">
            <span>{fuelNames[fuel]}</span>
            {distance !== null && <span className="distance-chip">{distance.toFixed(1).replace(".", ",")} km</span>}
          </div>
          <strong>{price?.toFixed(3).replace(".", ",")}<small> €/L</small></strong>
        </div>
        {price !== null && <StationPriceSparkline stationId={station.id} fuel={fuel} currentPrice={price} />}
      </div>

      <div className="comparison-card">
        <div className="comparison-copy">
          <strong>{Math.abs(difference).toFixed(1).replace(".", ",")}%</strong>
          <span>{difference <= 0 ? "por debajo" : "por encima"} de la media visible</span>
        </div>
        <div className="comparison-track" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(8, 50 + difference * 3))}%` }} />
        </div>
      </div>

      <div className="detail-meta">
        <span>Horario</span>
        <strong>{station.schedule}</strong>
      </div>

      <a
        className="route-button"
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          track("directions_click", {
            station_id: station.id,
            territorio: station.province,
            combustible: fuel,
          })
        }
      >
        <span>Abrir ruta</span>
        <b>↗</b>
      </a>
      <p className="detail-note">La ruta se abrirá en Google Maps.</p>
    </aside>
  );
}
