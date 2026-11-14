import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Only the public catalogue is crawlable. Private and transactional areas are excluded here and via X-Robots-Tag. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/student", "/api/", "/order/", "/login", "/register", "/enquire"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
