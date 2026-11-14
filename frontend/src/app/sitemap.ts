import type { MetadataRoute } from "next";
import { publicGet } from "@/lib/server-api";
import { site } from "@/lib/site";

export const revalidate = 3600;

/** Static pages plus every PUBLISHED project (the API only ever returns published ones). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/projects", "/categories", "/services", "/how-it-works", "/about", "/contact", "/faq", "/privacy", "/terms", "/dmca"];
  const projects = (await publicGet<{ slug: string; updatedAt: string }[]>("/sitemap", 3600)) ?? [];
  return [
    ...pages.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...projects.map((p) => ({
      url: `${site.url}/projects/${p.slug}`,
      lastModified: new Date(p.updatedAt.endsWith("Z") ? p.updatedAt : p.updatedAt + "Z"),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
