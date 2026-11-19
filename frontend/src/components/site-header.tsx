"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/categories", label: "Categories" },
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-baseline gap-2 font-display text-[1.35rem] leading-none font-semibold tracking-tight", className)}>
      <span aria-hidden className="inline-block h-4 w-2.5 translate-y-0.5 rounded-[2px] bg-primary" />
      {site.name}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, isStudent, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the mobile menu after navigation
  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  const account = loading ? (
    <span className="h-9 w-24" aria-hidden />
  ) : isStudent ? (
    <>
      <Link href="/student" className="btn-ghost btn-sm">My dashboard</Link>
      <button onClick={signOut} className="btn-outline btn-sm">Sign out</button>
    </>
  ) : me?.authenticated ? (
    <>
      <Link href="/admin" className="btn-ghost btn-sm">Admin</Link>
      <button onClick={signOut} className="btn-outline btn-sm">Sign out</button>
    </>
  ) : (
    <>
      <Link href="/login" className="btn-ghost btn-sm">Sign in</Link>
      <Link href="/enquire" className="btn-primary btn-sm">Enquire</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-sm">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="page flex h-16 items-center gap-6">
        <Wordmark />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
              className="rounded-md px-3 py-2 text-sm text-foreground/75 transition-colors hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {account}
        </div>
        <ThemeToggle className="ml-auto lg:hidden" />
        <button
          className="btn-ghost size-10 px-0 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t bg-background lg:hidden">
          <nav aria-label="Mobile" className="page flex flex-col py-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="border-b border-border/60 py-3 text-base last:border-0">
                {n.label}
              </Link>
            ))}
            <Link href="/contact" className="py-3 text-base">Contact</Link>
            <div className="flex flex-wrap gap-2 pt-3 pb-2">{account}</div>
          </nav>
        </div>
      )}
    </header>
  );
}
