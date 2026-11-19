/**
 * Decorative hero illustration for the home page. A stylised "project specimen" —
 * a window showing an app wireframe, a quality chart and a verified badge — drawn
 * with the site's own tokens so it reads correctly in both light and dark themes.
 * Purely decorative: it carries no information the surrounding copy doesn't.
 */
export function HeroArt() {
  return (
    <figure aria-hidden className="relative mx-auto w-full max-w-md lg:mr-0">
      {/* offset sheets suggest a stack of catalogue cards */}
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-xl border bg-secondary/70" />
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl border bg-card" />

      <div className="relative overflow-hidden rounded-xl border border-foreground/25 bg-card">
        <svg viewBox="0 0 420 340" className="block w-full" xmlns="http://www.w3.org/2000/svg">
          {/* window chrome */}
          <circle cx="26" cy="24" r="5" className="fill-primary" />
          <circle cx="44" cy="24" r="5" className="fill-ochre" />
          <circle cx="62" cy="24" r="5" className="fill-muted-foreground/50" />
          <rect x="150" y="18" width="170" height="13" rx="6.5" className="fill-muted" />
          <line x1="0" y1="48" x2="420" y2="48" className="stroke-border" strokeWidth="1.5" />

          {/* left sidebar */}
          <rect x="24" y="68" width="96" height="212" rx="10" className="fill-secondary/80" />
          <rect x="24" y="112" width="96" height="26" className="fill-primary/12" />
          <rect x="24" y="112" width="4" height="26" className="fill-primary" />
          {[84, 120, 156, 192, 228, 252].map((y, i) => (
            <rect
              key={y}
              x="40"
              y={y}
              width={i === 1 ? 56 : [64, 56, 60, 48, 58, 44][i]}
              height="8"
              rx="4"
              className={i === 1 ? "fill-primary/70" : "fill-muted-foreground/35"}
            />
          ))}

          {/* main panel heading */}
          <rect x="144" y="70" width="150" height="15" rx="4" className="fill-foreground/80" />
          <rect x="144" y="96" width="104" height="9" rx="4.5" className="fill-muted-foreground/45" />

          {/* bar chart (quality / popularity) */}
          <line x1="144" y1="266" x2="384" y2="266" className="stroke-border" strokeWidth="1.5" />
          {[
            { x: 150, h: 64, c: "fill-primary/35" },
            { x: 196, h: 104, c: "fill-primary/55" },
            { x: 242, h: 48, c: "fill-ochre/70" },
            { x: 288, h: 128, c: "fill-primary" },
            { x: 334, h: 84, c: "fill-primary/45" },
          ].map((b) => (
            <rect key={b.x} x={b.x} y={266 - b.h} width="32" height={b.h} rx="5" className={b.c} />
          ))}

          {/* verified / quality badge */}
          <circle cx="356" cy="104" r="30" className="fill-card" />
          <circle cx="356" cy="104" r="26" className="fill-primary" />
          <path
            d="M345 104 l7 7 l15 -16"
            fill="none"
            className="stroke-primary-foreground"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* floating tag pills overlapping the lower edge */}
          <g>
            <rect x="150" y="292" width="92" height="30" rx="15" className="fill-card stroke-border" strokeWidth="1.5" />
            <circle cx="168" cy="307" r="5" className="fill-primary" />
            <rect x="180" y="303" width="48" height="8" rx="4" className="fill-muted-foreground/45" />
            <rect x="254" y="292" width="76" height="30" rx="15" className="fill-card stroke-border" strokeWidth="1.5" />
            <circle cx="272" cy="307" r="5" className="fill-ochre" />
            <rect x="284" y="303" width="34" height="8" rx="4" className="fill-muted-foreground/45" />
          </g>

          {/* shelf accent — echoes the ProjectShelf mark */}
          <rect x="0" y="334" width="420" height="6" className="fill-primary" />
        </svg>
      </div>
    </figure>
  );
}
