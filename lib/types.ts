export type FuelKey = "g95" | "g98" | "diesel" | "dieselPlus";

export type Station = {
  id: string;
  brand: string;
  city: string;
  province: string;
  address: string;
  schedule: string;
  lat: number;
  lng: number;
  g95: number | null;
  g98: number | null;
  diesel: number | null;
  dieselPlus: number | null;
};

export type StationsResponse = {
  updatedAt: string;
  total: number;
  source: "live" | "fallback";
  stations: Station[];
};
