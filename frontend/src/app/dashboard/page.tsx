"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * Convenience route: anyone landing on /dashboard (a bookmark, a typed URL, or an
 * old link) is sent to the dashboard for their role. Students go to the student
 * portal, admins to the admin console, and signed-out visitors to the login page.
 */
export default function DashboardRedirect() {
  const { loading, me, isStudent, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isAdmin) router.replace("/admin");
    else if (isStudent) router.replace("/student");
    else if (me?.authenticated) router.replace("/");
    else router.replace("/login");
  }, [loading, me, isStudent, isAdmin, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs font-mono">Opening your dashboard…</span>
      </div>
    </div>
  );
}
