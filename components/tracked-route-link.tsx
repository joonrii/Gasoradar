"use client";

import { track } from "@/lib/analytics";
import type { FuelKey, Station } from "@/lib/types";

export function TrackedRouteLink({ station, fuel }: { station: Station; fuel: FuelKey }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <a
      className="city-route-link"
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        track("directions_click", {
          station_id: station.id,
          territorio: station.province,
          combustible: fuel,
          origin: "seo_city_page",
        })
      }
    >
      Abrir ruta <span aria-hidden="true">↗</span>
    </a>
  );
}
