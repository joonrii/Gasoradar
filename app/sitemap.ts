import type { MetadataRoute } from "next";
import { SEO_LOCATIONS, getSeoLocationPath } from "@/lib/locations";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    {
      url: "https://www.gasolinago.com/",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://www.gasolinago.com/privacidad",
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: "https://www.gasolinago.com/gasolineras",
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  return pages.concat(
    SEO_LOCATIONS.map((location) => ({
      url: `https://www.gasolinago.com${getSeoLocationPath(location)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  );
}
