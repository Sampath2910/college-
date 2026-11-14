import Link from "next/link";
import { Star, ThumbsUp } from "lucide-react";
import { fmtDate, fmtNumber } from "@/lib/format";
import { PROJECT_TYPES, type ProjectCard as Card } from "@/lib/types";

/** Popularity is labelled by its source: GitHub stars and Kaggle votes are different things and are never mixed. */
export function Popularity({ card }: { card: Card }) {
  if (card.stars == null) return null;
  const github = card.platformCode === "GITHUB";
  return (
    <span className="inline-flex items-center gap-1" title={github ? "Stars on GitHub" : "Votes on Kaggle"}>
      {github ? <Star className="size-3.5" aria-hidden /> : <ThumbsUp className="size-3.5" aria-hidden />}
      {fmtNumber(card.stars)}
      <span className="sr-only">{github ? "GitHub stars" : "Kaggle votes"}</span>
    </span>
  );
}

export function ProjectCard({ card, reason }: { card: Card; reason?: string }) {
  return (
    <article className="group relative flex h-full min-w-0 flex-col rounded-lg border bg-card p-5 transition-[border-color,box-shadow] duration-200 hover:border-foreground/40 hover:shadow-[0_2px_0_var(--border)]">
      <p className="ref flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span>{card.platform}</span>
        <span aria-hidden className="text-border">/</span>
        <span>{PROJECT_TYPES[card.projectType] ?? card.projectType}</span>
      </p>
      <h3 className="mt-3 text-xl leading-snug [overflow-wrap:anywhere]">
        <Link href={`/projects/${card.slug}`} className="decoration-primary/50 underline-offset-4 after:absolute after:inset-0 group-hover:underline">
          {card.title}
        </Link>
      </h3>
      {card.shortDescription && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground/75 [overflow-wrap:anywhere]">{card.shortDescription}</p>
      )}
      {reason && <p className="mt-3 border-l-2 border-ochre/60 pl-3 text-xs leading-relaxed text-foreground/70">{reason}</p>}
      {card.technologies.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
          {card.technologies.slice(0, 4).map((t) => (
            <li key={t} className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-[0.6875rem] text-foreground/80">{t}</li>
          ))}
          {card.technologies.length > 4 && (
            <li className="px-1 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">+{card.technologies.length - 4}</li>
          )}
        </ul>
      )}
      {/* mt-auto pins the meta row to the bottom so rows of cards line up */}
      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          {card.category && <span className="text-foreground/80">{card.category}</span>}
          <Popularity card={card} />
          {card.licence && <span title={card.licence}>{card.licence.length > 18 ? card.licence.slice(0, 17) + "…" : card.licence}</span>}
          {card.sourceUpdatedAt && <span className="sm:ml-auto">Updated {fmtDate(card.sourceUpdatedAt)}</span>}
        </div>
      </div>
    </article>
  );
}

export function ProjectGrid({ cards, columns = 3 }: { cards: Card[]; columns?: 2 | 3 }) {
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}>
      {cards.map((c) => (
        <li key={c.id} className="min-w-0"><ProjectCard card={c} /></li>
      ))}
    </ul>
  );
}
