import { chromium } from "@playwright/test";
const base = process.argv[2];
const b = await chromium.launch();
for (const p of ["/", "/projects", "/projects/kkfileview-by-kekingcn"]) {
  const page = await b.newPage({ viewport: { width: 1366, height: 800 } });
  let bytes = 0, reqs = 0;
  page.on("response", async (r) => { reqs++; bytes += Number(r.headers()["content-length"] ?? 0); });
  await page.goto(base + p, { waitUntil: "load" });
  const m = await page.evaluate(() => new Promise((res) => {
    const nav = performance.getEntriesByType("navigation")[0];
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); res({ lcp: Math.round(e.startTime), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) }); }).observe({ type: "largest-contentful-paint", buffered: true });
    setTimeout(() => res({ lcp: -1, dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd) }), 3000);
  }));
  console.log(p, JSON.stringify(m), "requests", reqs, "transferKB", Math.round(bytes / 1024));
  await page.close();
}
await b.close();
