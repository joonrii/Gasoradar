import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";
import { SEO_LOCATIONS, getSeoLocationPath } from "@/lib/locations";
import { getMonthlyReports } from "@/lib/monthly-reports";

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
    {
      url: "https://www.gasolinago.com/blog",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://www.gasolinago.com/observatorio",
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://www.gasolinago.com/observatorio/informes",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  return pages.concat(
    BLOG_POSTS.map((post) => ({
      url: `https://www.gasolinago.com/blog/${post.slug}`,
      lastModified: post.publishedAt,
      changeFrequency: "monthly" as const,
      priority: post.featured ? 0.8 : 0.7,
    })),
    getMonthlyReports().map((report) => ({
      url: `https://www.gasolinago.com/observatorio/informes/${report.slug}`,
      lastModified: report.latestDate,
      changeFrequency: report.isComplete ? "yearly" as const : "daily" as const,
      priority: report.isComplete ? 0.7 : 0.8,
    })),
    SEO_LOCATIONS.map((location) => ({
      url: `https://www.gasolinago.com${getSeoLocationPath(location)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  );
}
