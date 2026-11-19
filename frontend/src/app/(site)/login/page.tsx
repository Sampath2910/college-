"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GraduationCap, Lock, LogIn, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<any>("/auth/login", { email: email.trim(), password });
      toast.success(`Welcome back, ${res.fullName || "Student"}!`);
      const me = await refresh();
      if (me.roles?.includes("ADMIN")) {
        router.push("/admin");
      } else {
        router.push("/student/saved");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Sign In to ProjectShelf</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Access your bookmarked projects, enquiry status, and recommendations.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground">Email Address</label>
            <div className="relative mt-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="field pl-9 text-xs"
              />
              <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="field pl-9 pr-9 text-xs"
              />
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            <LogIn className="size-4" />
            <span>{loading ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        <div className="mt-6 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          Don't have an account yet?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Register as a Student
          </Link>
        </div>
      </div>
    </div>
  );
}

