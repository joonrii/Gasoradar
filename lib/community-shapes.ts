import fs from "node:fs";
import path from "node:path";

// Convierte public/data/spain-communities.geojson (400 KB) en trazados SVG
// simplificados (~30 KB) al compilar. Canarias va en un recuadro; Ceuta y
// Melilla son demasiado pequeñas para el mapa y aparecen solo en la lista.

export type CommunityShape = { code: string; d: string };
export type CommunityShapes = { width: number; height: number; canaryBox: [number, number, number, number]; shapes: CommunityShape[] };

type Ring = Array<[number, number]>;
type Geometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
type Feature = { properties: { CodINE: string }; geometry: Geometry };

const WIDTH = 600;
const MAIN = { lon0: -9.6, lon1: 4.6, lat0: 35.8, lat1: 43.9 };
const KX = Math.cos((40 * Math.PI) / 180);
const SCALE = WIDTH / ((MAIN.lon1 - MAIN.lon0) * KX);
const HEIGHT = Math.ceil((MAIN.lat1 - MAIN.lat0) * SCALE);
const CANARY = { lon0: -18.3, lat1: 29.5, ox: 8, oy: HEIGHT - 92, scale: SCALE * 0.9, kx: Math.cos((28.3 * Math.PI) / 180) };

const projectMain = ([lon, lat]: [number, number]): [number, number] => [(lon - MAIN.lon0) * KX * SCALE, (MAIN.lat1 - lat) * SCALE];
const projectCanary = ([lon, lat]: [number, number]): [number, number] => [
  CANARY.ox + (lon - CANARY.lon0) * CANARY.kx * CANARY.scale,
  CANARY.oy + (CANARY.lat1 - lat) * CANARY.scale,
];

function simplify(points: Ring, tolerance: number): Ring {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [x1, y1] = points[a];
    const [x2, y2] = points[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    let max = 0;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      const distance = Math.abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / length;
      if (distance > max) { max = distance; index = i; }
    }
    if (max > tolerance) { keep[index] = 1; stack.push([a, index], [index, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

const area = (ring: Ring) => Math.abs(ring.reduce((sum, [x, y], i) => {
  const [x2, y2] = ring[(i + 1) % ring.length];
  return sum + x * y2 - x2 * y;
}, 0) / 2);

// Los anillos vienen cerrados: se parten por el punto más lejano antes de simplificar.
function simplifyRing(ring: Ring): Ring {
  const points = ring.slice(0, -1);
  let far = 0;
  points.forEach(([x, y], i) => {
    if (Math.hypot(x - points[0][0], y - points[0][1]) > Math.hypot(points[far][0] - points[0][0], points[far][1] - points[0][1])) far = i;
  });
  if (!far) return points;
  return [
    ...simplify(points.slice(0, far + 1), 0.7).slice(0, -1),
    ...simplify([...points.slice(far), points[0]], 0.7).slice(0, -1),
  ];
}

let cached: CommunityShapes | null = null;

export function getCommunityShapes(): CommunityShapes {
  if (cached) return cached;
  const geo = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/spain-communities.geojson"), "utf8")) as { features: Feature[] };
  const shapes: CommunityShape[] = [];
  for (const feature of geo.features) {
    const code = feature.properties.CodINE;
    if (code === "18" || code === "19") continue;
    const project = code === "05" ? projectCanary : projectMain;
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    let d = "";
    for (const polygon of polygons) {
      const ring = simplifyRing(polygon[0].map(project));
      if (ring.length < 3 || area(ring) < 4) continue;
      d += `M${ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;
    }
    shapes.push({ code, d });
  }
  cached = { width: WIDTH, height: HEIGHT, canaryBox: [CANARY.ox - 4, CANARY.oy - 10, 190, 100], shapes };
  return cached;
}
