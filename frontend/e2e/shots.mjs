// Visual review helper: node e2e/shots.mjs <outDir> [base] — screenshots every page at desktop and mobile widths.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const out = process.argv[2] ?? "shots", base = process.argv[3] ?? "http://localhost:3000";
const only = process.argv[4]?.split(",").map((o) => (o === "home" ? "/" : o));
fs.mkdirSync(out, { recursive: true });
const api = async (p) => (await fetch("http://localhost:8080/api/public" + p)).json();
const slug = (await api("/projects?size=1")).items?.[0]?.slug;
const pub = ["/", "/projects", "/categories", "/search?q=java", "/services", "/how-it-works", "/about", "/contact", "/faq", "/privacy", "/terms", "/dmca", "/enquire", "/login", "/register"];
if (slug) pub.push("/projects/" + slug);
const student = ["/student", "/student/saved", "/student/enquiries", "/student/orders", "/student/recommendations", "/student/settings"];
const admin = ["/admin", "/admin/projects", "/admin/projects/1", "/admin/duplicates", "/admin/discovery", "/admin/enquiries", "/admin/orders", "/admin/engagement", "/admin/integrations", "/admin/settings", "/admin/audit", "/admin/dmca"];
const browser = await chromium.launch();
const report = [];
async function login(ctx, email, password) {
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  const r = await page.evaluate(async ([email, password]) => {
    await fetch("/api/auth/me");
    const t = decodeURIComponent(document.cookie.split("; ").find((c) => c.startsWith("XSRF-TOKEN="))?.split("=")[1] ?? "");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": t }, body: JSON.stringify({ email, password }) });
    return res.status;
  }, [email, password]);
  await page.close();
  return r;
}
async function run(name, paths, creds) {
  for (const [vp, w, h] of [["d", 1440, 900], ["m", 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    if (creds) console.log(name, "login", await login(ctx, ...creds));
    for (const p of paths) {
      if (only && !only.some((o) => p === o || (o !== "/" && p.startsWith(o)))) continue;
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
      page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 160)));
      const t0 = Date.now();
      const res = await page.goto(base + p, { waitUntil: "networkidle", timeout: 45000 }).catch((e) => ({ status: () => "ERR " + e.message.slice(0, 60) }));
      const ms = Date.now() - t0;
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const file = `${out}/${vp}${p.replace(/[/?=&]/g, "_")}.png`;
      await page.screenshot({ path: file, fullPage: true });
      report.push(`${vp} ${p} status=${res.status()} ${ms}ms overflowX=${overflow}${errors.length ? " ERRORS: " + [...new Set(errors)].join(" | ") : ""}`);
      await page.close();
    }
    await ctx.close();
  }
}
await run("public", pub);
if (process.env.STUDENT_EMAIL) await run("student", student, [process.env.STUDENT_EMAIL, process.env.STUDENT_PASSWORD]);
if (process.env.ADMIN_EMAIL) await run("admin", admin, [process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD]);
await browser.close();
console.log(report.join("\n"));
