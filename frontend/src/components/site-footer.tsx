import Link from "next/link";
import { site } from "@/lib/site";
import { Wordmark } from "./site-header";

const COLUMNS = [
  { title: "Catalogue", links: [["/projects", "All projects"], ["/categories", "Categories"], ["/search", "Search"]] },
  { title: "Help", links: [["/services", "Services"], ["/how-it-works", "How it works"], ["/faq", "FAQ"], ["/enquire", "Send an enquiry"]] },
  { title: "Company", links: [["/about", "About"], ["/contact", "Contact"], ["/dmca", "Open-Source & DMCA"], ["/privacy", "Privacy policy"], ["/terms", "Terms and conditions"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-secondary/50">
      <div className="page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            A catalogue of publicly available projects for students. Listings belong to their original authors and are shown with their source and licence.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="ref mb-4">{col.title}</h2>
            <ul className="space-y-2.5 text-sm">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-foreground/80 hover:text-foreground hover:underline hover:underline-offset-4">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <div className="page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. Project names and content belong to their respective authors.</p>
          <p>Please follow your institution&apos;s rules on originality and attribution.</p>
        </div>
      </div>
    </footer>
  );
}
