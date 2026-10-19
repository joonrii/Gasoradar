import { fmtPrice } from "@/components/charts/chart-utils";
import { SevenSeg } from "@/components/seven-seg";
import type { FuelKey } from "@/lib/types";

const LABELS: Record<FuelKey, { name: string; className: string }> = {
  g95: { name: "Gasolina 95", className: "g95" },
  g98: { name: "Gasolina 98", className: "g98" },
  diesel: { name: "Diésel", className: "diesel" },
  dieselPlus: { name: "Diésel+", className: "diesel-plus" },
};

export type TotemCell = { fuel: FuelKey; price: number; note?: string; change?: number | null };

// El letrero de precios de la entrada de una gasolinera.
export function Totem({ cells, label }: { cells: TotemCell[]; label: string }) {
  return (
    <div className="totem" role="list" aria-label={label}>
      {cells.map((cell) => {
        const meta = LABELS[cell.fuel];
        const change = cell.change ?? null;
        return (
          <div className="totem-cell" role="listitem" key={cell.fuel} aria-label={`${meta.name}: ${fmtPrice(cell.price)} euros el litro`}>
            <span className={`totem-label ${meta.className}`}>{meta.name}</span>
            <SevenSeg text={fmtPrice(cell.price)} label={`${fmtPrice(cell.price)} €/L`} />
            {change === null ? (cell.note ? <span className="totem-note">{cell.note}</span> : null) : Math.abs(change) < 0.0005
              ? <span className="totem-note">Igual que ayer</span>
              : <span className={`totem-note ${change < 0 ? "down" : "up"}`}>{change < 0 ? "▼" : "▲"} {fmtPrice(Math.abs(change) * 100, 1)} cént. desde ayer</span>}
          </div>
        );
      })}
    </div>
  );
}
