export type SeoLocation = {
  municipalityId?: string;
  center?: { lat: number; lng: number };
  provinceId: string;
  provinceSlug: string;
  citySlug: string;
  city: string;
  province: string;
  displayName: string;
};

export const SEO_LOCATIONS: SeoLocation[] = [
  { provinceId: "28", provinceSlug: "madrid", citySlug: "madrid", city: "Madrid", province: "MADRID", displayName: "Madrid" },
  { provinceId: "08", provinceSlug: "barcelona", citySlug: "barcelona", city: "Barcelona", province: "BARCELONA", displayName: "Barcelona" },
  { provinceId: "46", provinceSlug: "valencia", citySlug: "valencia", city: "Valencia", province: "VALENCIA / VALÈNCIA", displayName: "Valencia" },
  { provinceId: "41", provinceSlug: "sevilla", citySlug: "sevilla", city: "Sevilla", province: "SEVILLA", displayName: "Sevilla" },
  { provinceId: "50", provinceSlug: "zaragoza", citySlug: "zaragoza", city: "Zaragoza", province: "ZARAGOZA", displayName: "Zaragoza" },
  { provinceId: "29", provinceSlug: "malaga", citySlug: "malaga", city: "Málaga", province: "MÁLAGA", displayName: "Málaga" },
  { provinceId: "30", provinceSlug: "murcia", citySlug: "murcia", city: "Murcia", province: "MURCIA", displayName: "Murcia" },
  { provinceId: "07", provinceSlug: "baleares", citySlug: "palma-de-mallorca", city: "Palma de Mallorca", province: "BALEARS (ILLES)", displayName: "Palma de Mallorca" },
  { provinceId: "35", provinceSlug: "las-palmas", citySlug: "las-palmas-de-gran-canaria", city: "Palmas de Gran Canaria (Las)", province: "PALMAS (LAS)", displayName: "Las Palmas de Gran Canaria" },
  { provinceId: "48", provinceSlug: "bizkaia", citySlug: "bilbao", city: "Bilbao", province: "BIZKAIA", displayName: "Bilbao" },
  { provinceId: "03", provinceSlug: "alicante", citySlug: "alicante", city: "Alicante/Alacant", province: "ALICANTE", displayName: "Alicante" },
  { provinceId: "14", provinceSlug: "cordoba", citySlug: "cordoba", city: "Córdoba", province: "CÓRDOBA", displayName: "Córdoba" },
  { provinceId: "47", provinceSlug: "valladolid", citySlug: "valladolid", city: "Valladolid", province: "VALLADOLID", displayName: "Valladolid" },
  { provinceId: "36", provinceSlug: "pontevedra", citySlug: "vigo", city: "Vigo", province: "PONTEVEDRA", displayName: "Vigo" },
  { provinceId: "15", provinceSlug: "a-coruna", citySlug: "a-coruna", city: "Coruña (A)", province: "CORUÑA (A)", displayName: "A Coruña" },
  { provinceId: "18", provinceSlug: "granada", citySlug: "granada", city: "Granada", province: "GRANADA", displayName: "Granada" },
  { provinceId: "33", provinceSlug: "asturias", citySlug: "oviedo", city: "Oviedo", province: "ASTURIAS", displayName: "Oviedo" },
  { provinceId: "43", provinceSlug: "tarragona", citySlug: "tarragona", city: "Tarragona", province: "TARRAGONA", displayName: "Tarragona" },
  { provinceId: "20", provinceSlug: "gipuzkoa", citySlug: "san-sebastian", city: "Donostia-San Sebastián", province: "GIPUZKOA", displayName: "San Sebastián" },
  { provinceId: "31", provinceSlug: "navarra", citySlug: "pamplona", city: "Pamplona/Iruña", province: "NAVARRA", displayName: "Pamplona" },
];

export function getSeoLocation(provinceSlug: string, citySlug: string) {
  return SEO_LOCATIONS.find(
    (location) => location.provinceSlug === provinceSlug && location.citySlug === citySlug,
  );
}

export function getSeoLocationPath(location: SeoLocation) {
  return `/gasolineras/${location.provinceSlug}/${location.citySlug}`;
}
