"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    college: "",
    acceptTerms: false,
    activityConsent: true,
    emailConsent: true,
    whatsappConsent: false,
  });

  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.acceptTerms) {
      toast.error("Please accept the terms of service to proceed.");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (formData.whatsappConsent && !formData.phone.trim()) {
      toast.error("Please provide a phone number if you consent to WhatsApp messages.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        college: formData.college.trim() || undefined,
        acceptTerms: true,
        activityConsent: formData.activityConsent,
        emailConsent: formData.emailConsent,
        whatsappConsent: formData.whatsappConsent,
      });

      toast.success("Account registered successfully! Welcome to ProjectShelf.");
      await refresh();
      router.push("/student/saved");
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Create Student Account</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Save projects, track mentorship enquiries, and receive custom academic recommendations.
          </p>
        </div>

        <form onSubmit={handleRegister} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground">Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Ananya Sen"
                className="field mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ananya@college.edu"
                className="field mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">Password * (Min 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••••••"
              className="field mt-1 text-xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-foreground">College / University</label>
              <input
                type="text"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                placeholder="e.g. VTU, Pune University"
                className="field mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground">Phone / WhatsApp</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="field mt-1 text-xs"
              />
            </div>
          </div>

          {/* Privacy & Consent Checklist */}
          <div className="mt-4 rounded-lg border border-border/80 bg-secondary/30 p-4 space-y-3 text-xs">
            <h3 className="font-semibold text-foreground flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Privacy & Communication Consent</span>
            </h3>

            <label className="flex items-start gap-2.5 text-muted-foreground">
              <input
                type="checkbox"
                required
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                className="mt-0.5 rounded border-input"
              />
              <span>
                I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. *
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-muted-foreground">
              <input
                type="checkbox"
                checked={formData.activityConsent}
                onChange={(e) => setFormData({ ...formData, activityConsent: e.target.checked })}
                className="mt-0.5 rounded border-input"
              />
              <span>
                Allow anonymous activity tracking to improve my project recommendations.
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-muted-foreground">
              <input
                type="checkbox"
                checked={formData.emailConsent}
                onChange={(e) => setFormData({ ...formData, emailConsent: e.target.checked })}
                className="mt-0.5 rounded border-input"
              />
              <span>
                Send me occasional emails about new projects in my preferred categories.
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-muted-foreground">
              <input
                type="checkbox"
                checked={formData.whatsappConsent}
                onChange={(e) => setFormData({ ...formData, whatsappConsent: e.target.checked })}
                className="mt-0.5 rounded border-input"
              />
              <span>
                Send me project alerts via WhatsApp (requires phone number).
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            <UserPlus className="size-4" />
            <span>{loading ? "Creating Account..." : "Create Student Account"}</span>
          </button>
        </form>

        <div className="mt-6 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

