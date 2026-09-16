import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
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
  ];
}
