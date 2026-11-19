"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  Compass,
  Copy,
  CreditCard,
  ExternalLink,
  FolderTree,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders & Sales", icon: CreditCard },
  { href: "/admin/projects", label: "Projects & Review", icon: FolderTree },
  { href: "/admin/duplicates", label: "Duplicates", icon: Copy },
  { href: "/admin/discovery", label: "Discovery Jobs", icon: Compass },
  { href: "/admin/enquiries", label: "Student Enquiries", icon: MessageSquare },
  { href: "/admin/engagement", label: "AI Engagement", icon: Bot },
  { href: "/admin/dmca", label: "DMCA & Attribution", icon: ShieldCheck },
  { href: "/admin/integrations", label: "Integrations", icon: Layers },
  { href: "/admin/settings", label: "System Settings", icon: Sliders },
  { href: "/admin/audit", label: "Audit Logs", icon: History },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { me, loading, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!me?.authenticated || !isAdmin)) {
      router.push("/login");
    }
  }, [loading, me, isAdmin, router]);

  if (loading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-mono text-xs text-muted-foreground">Authorizing administrator...</span>
        </div>
      </div>
    );
  }

  if (!me?.authenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-shell flex min-h-screen bg-background text-foreground">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-border bg-card">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold font-mono text-xs">
              PS
            </span>
            <div className="leading-tight">
              <span className="font-bold text-sm tracking-tight">ProjectShelf</span>
              <span className="block text-[0.625rem] font-mono text-primary uppercase font-bold tracking-wider">Admin Console</span>
            </div>
          </Link>
          <Link
            href="/"
            target="_blank"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Open public website"
          >
            <ExternalLink className="size-4" />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between rounded-md bg-secondary/50 p-2 text-xs">
            <div className="min-w-0 pr-2">
              <span className="block truncate font-semibold">{me.fullName || "Admin"}</span>
              <span className="block truncate text-[0.6875rem] text-muted-foreground">{me.email}</span>
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => router.push("/"))}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Admin Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-8 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="size-4 text-primary" />
            <span>Signed in as administrator</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] text-primary">
              <span>Internal · not indexed</span>
            </span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

