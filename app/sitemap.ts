import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://gasoradar-teal.vercel.app/",
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://gasoradar-teal.vercel.app/privacidad",
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
