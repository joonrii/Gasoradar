export type Community = {
  code: string;
  slug: string;
  name: string;
  shortName: string;
  provinceIds: string[];
  provinceNames: string[];
  center: [number, number];
  zoom: number;
};

export const COMMUNITIES: Community[] = [
  { code: "01", slug: "andalucia", name: "Andalucía", shortName: "Andalucía", provinceIds: ["04", "11", "14", "18", "21", "23", "29", "41"], provinceNames: ["ALMERÍA", "CÁDIZ", "CÓRDOBA", "GRANADA", "HUELVA", "JAÉN", "MÁLAGA", "SEVILLA"], center: [37.45, -4.7], zoom: 7 },
  { code: "02", slug: "aragon", name: "Aragón", shortName: "Aragón", provinceIds: ["22", "44", "50"], provinceNames: ["HUESCA", "TERUEL", "ZARAGOZA"], center: [41.3, -0.6], zoom: 7 },
  { code: "03", slug: "asturias", name: "Principado de Asturias", shortName: "Asturias", provinceIds: ["33"], provinceNames: ["ASTURIAS"], center: [43.3, -5.85], zoom: 8 },
  { code: "04", slug: "baleares", name: "Illes Balears", shortName: "Baleares", provinceIds: ["07"], provinceNames: ["BALEARS (ILLES)"], center: [39.55, 2.85], zoom: 8 },
  { code: "05", slug: "canarias", name: "Canarias", shortName: "Canarias", provinceIds: ["35", "38"], provinceNames: ["PALMAS (LAS)", "SANTA CRUZ DE TENERIFE"], center: [28.35, -15.7], zoom: 7 },
  { code: "06", slug: "cantabria", name: "Cantabria", shortName: "Cantabria", provinceIds: ["39"], provinceNames: ["CANTABRIA"], center: [43.18, -4.05], zoom: 8 },
  { code: "07", slug: "castilla-y-leon", name: "Castilla y León", shortName: "Castilla y León", provinceIds: ["05", "09", "24", "34", "37", "40", "42", "47", "49"], provinceNames: ["ÁVILA", "BURGOS", "LEÓN", "PALENCIA", "SALAMANCA", "SEGOVIA", "SORIA", "VALLADOLID", "ZAMORA"], center: [41.75, -4.75], zoom: 7 },
  { code: "08", slug: "castilla-la-mancha", name: "Castilla-La Mancha", shortName: "Castilla-La Mancha", provinceIds: ["02", "13", "16", "19", "45"], provinceNames: ["ALBACETE", "CIUDAD REAL", "CUENCA", "GUADALAJARA", "TOLEDO"], center: [39.55, -3.2], zoom: 7 },
  { code: "09", slug: "cataluna", name: "Cataluña", shortName: "Cataluña", provinceIds: ["08", "17", "25", "43"], provinceNames: ["BARCELONA", "GIRONA", "LLEIDA", "TARRAGONA"], center: [41.8, 1.55], zoom: 7 },
  { code: "10", slug: "comunitat-valenciana", name: "Comunitat Valenciana", shortName: "C. Valenciana", provinceIds: ["03", "12", "46"], provinceNames: ["ALICANTE", "CASTELLÓN / CASTELLÓ", "VALENCIA / VALÈNCIA"], center: [39.45, -0.45], zoom: 7 },
  { code: "11", slug: "extremadura", name: "Extremadura", shortName: "Extremadura", provinceIds: ["06", "10"], provinceNames: ["BADAJOZ", "CÁCERES"], center: [39.0, -6.1], zoom: 7 },
  { code: "12", slug: "galicia", name: "Galicia", shortName: "Galicia", provinceIds: ["15", "27", "32", "36"], provinceNames: ["CORUÑA (A)", "LUGO", "OURENSE", "PONTEVEDRA"], center: [42.8, -8.0], zoom: 7 },
  { code: "13", slug: "madrid", name: "Comunidad de Madrid", shortName: "Madrid", provinceIds: ["28"], provinceNames: ["MADRID"], center: [40.42, -3.7], zoom: 9 },
  { code: "14", slug: "murcia", name: "Región de Murcia", shortName: "Murcia", provinceIds: ["30"], provinceNames: ["MURCIA"], center: [37.95, -1.35], zoom: 8 },
  { code: "15", slug: "navarra", name: "Comunidad Foral de Navarra", shortName: "Navarra", provinceIds: ["31"], provinceNames: ["NAVARRA"], center: [42.7, -1.65], zoom: 8 },
  { code: "16", slug: "pais-vasco", name: "País Vasco / Euskadi", shortName: "País Vasco", provinceIds: ["01", "20", "48"], provinceNames: ["ARABA/ÁLAVA", "GIPUZKOA", "BIZKAIA"], center: [43.0, -2.6], zoom: 8 },
  { code: "17", slug: "la-rioja", name: "La Rioja", shortName: "La Rioja", provinceIds: ["26"], provinceNames: ["RIOJA (LA)"], center: [42.3, -2.45], zoom: 8 },
  { code: "18", slug: "ceuta", name: "Ciudad Autónoma de Ceuta", shortName: "Ceuta", provinceIds: ["51"], provinceNames: ["CEUTA"], center: [35.89, -5.32], zoom: 11 },
  { code: "19", slug: "melilla", name: "Ciudad Autónoma de Melilla", shortName: "Melilla", provinceIds: ["52"], provinceNames: ["MELILLA"], center: [35.29, -2.94], zoom: 11 },
];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export function getCommunityBySlug(slug: string | null) {
  return COMMUNITIES.find((community) => community.slug === slug) ?? null;
}

export function getCommunityByCode(code: string) {
  return COMMUNITIES.find((community) => community.code === code) ?? null;
}

export function getCommunityByProvinceName(provinceName: string) {
  const province = normalize(provinceName);
  return COMMUNITIES.find((community) =>
    community.provinceNames.some((name) => normalize(name) === province),
  ) ?? null;
}

export function stationBelongsToCommunity(provinceName: string, community: Community) {
  const province = normalize(provinceName);
  return community.provinceNames.some((name) => normalize(name) === province);
}
