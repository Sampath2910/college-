"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Clock, GraduationCap, LayoutDashboard, LogOut, MessageSquare, PackageCheck, Settings, Sparkles, User } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/student/orders", label: "My Orders & Downloads", icon: PackageCheck },
  { href: "/student/saved", label: "Saved Projects", icon: Bookmark },
  { href: "/student/enquiries", label: "My Enquiries", icon: MessageSquare },
  { href: "/student/recommendations", label: "Recommended for You", icon: Sparkles },
  { href: "/student/settings", label: "Profile & Privacy", icon: Settings },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { me, loading, isStudent, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!me?.authenticated || !isStudent)) {
      router.push("/login");
    }
  }, [loading, me, isStudent, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="page flex flex-1 items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs font-mono">Loading student portal...</span>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!me?.authenticated || !isStudent) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="page flex-1 py-8 sm:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          {/* Student Sidebar */}
          <aside className="w-full md:w-64 shrink-0 rounded-xl border border-border/80 bg-card p-4">
            <div className="border-b border-border/60 pb-4 mb-4">
              <p className="ref text-primary">Student Dashboard</p>
              <h2 className="mt-1 text-base font-bold text-foreground truncate">{me.fullName || "Student"}</h2>
              <p className="text-xs text-muted-foreground truncate">{me.email}</p>
            </div>

            <nav className="space-y-1 text-xs">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => logout().then(() => router.push("/"))}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="size-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Student Main View */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

