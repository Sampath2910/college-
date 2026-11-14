"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PackageOrderModal } from "@/components/package-order-modal";
import type { PackageOption } from "@/lib/types";

type Props = { projectId: number; projectTitle: string; packages?: PackageOption[] };

/**
 * Paid help for a listing, shown as full-width rows so each option has room for its description.
 * Only real prices are shown: a struck-through "was" price appears solely when the API reports a higher original price.
 */
export function AcademicPackages({ projectId, projectTitle, packages }: Props) {
  const [selected, setSelected] = useState<PackageOption | null>(null);
  if (!packages || packages.length === 0) return null;

  return (
    <section id="packages" className="scroll-mt-24">
      <p className="ref">Paid help for this project</p>
      <h2 className="mt-1.5 text-2xl sm:text-3xl">Support packages</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/75">
        These cover our time and the material we prepare. The project itself stays with its author: you get the code from the original source, under its licence.
      </p>

      <ul className="mt-6 space-y-4">
        {packages.map((pkg) => (
          <li
            key={pkg.type}
            className={`grid gap-5 rounded-lg border bg-card p-5 sm:p-6 md:grid-cols-[1fr_auto] md:gap-8 ${pkg.popular ? "border-primary/60" : ""}`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-xl">{pkg.title}</h3>
                {pkg.popular && <span className="ref rounded-sm bg-ochre-soft px-2 py-0.5 text-ochre">Most requested</span>}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">{pkg.subtitle}</p>
              <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-foreground/85">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-4 md:w-44 md:flex-col md:items-end md:justify-center md:border-t-0 md:border-l md:pt-0 md:pl-8">
              <p className="md:text-right">
                <span className="font-display text-3xl leading-none">₹{pkg.priceInr.toLocaleString("en-IN")}</span>
                {pkg.originalPriceInr != null && pkg.originalPriceInr > pkg.priceInr && (
                  <span className="ml-2 text-sm text-muted-foreground line-through">₹{pkg.originalPriceInr.toLocaleString("en-IN")}</span>
                )}
                <span className="mt-1 block text-xs text-muted-foreground">one-time</span>
              </p>
              <button type="button" onClick={() => setSelected(pkg)} className={pkg.popular ? "btn-primary" : "btn-outline"}>
                Request this
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        No payment is taken on this site. We confirm your request and payment details with you first. We do not promise marks or approval, and you remain responsible for following your institution's rules.
      </p>

      <PackageOrderModal
        projectId={projectId}
        projectTitle={projectTitle}
        selectedPackage={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
