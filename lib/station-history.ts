import fs from "node:fs/promises";
import path from "node:path";
import type { FuelKey } from "@/lib/types";

// Generado a diario por scripts/actualizar-historico.mjs: un archivo por provincia
// con las fechas en columnas para no repetir claves en cada día.
export type ProvinceHistory = {
  fechas: string[];
  estaciones: Record<string, Partial<Record<FuelKey, Array<number | null>>>>;
};

const cache = new Map<string, Promise<ProvinceHistory | null>>();

export function readProvinceHistory(provinceId: string) {
  if (!/^\d{2}$/.test(provinceId)) return Promise.resolve(null);
  let entry = cache.get(provinceId);
  if (!entry) {
    entry = fs
      .readFile(path.join(process.cwd(), "datos", "rolling", `${provinceId}.json`), "utf8")
      .then((text) => JSON.parse(text) as ProvinceHistory)
      .catch(() => null);
    cache.set(provinceId, entry);
  }
  return entry;
}
