"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ShieldCheck, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function StudentSettingsPage() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    deletionRequestedAt: null as string | null,
  });

  const [prefs, setPrefs] = useState({
    activityConsent: true,
    emailOptIn: true,
    whatsappOptIn: false,
    preferredChannel: "EMAIL",
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<any>("/student/profile"),
      api.get<any>("/student/preferences"),
    ])
      .then(([prof, pr]) => {
        setProfile({
          fullName: prof.fullName ?? "",
          email: prof.email ?? "",
          phone: prof.phone ?? "",
          college: prof.college ?? "",
          deletionRequestedAt: prof.deletionRequestedAt ?? null,
        });
        setPrefs({
          activityConsent: pr.activityConsent ?? false,
          emailOptIn: pr.emailOptIn ?? false,
          whatsappOptIn: pr.whatsappOptIn ?? false,
          preferredChannel: pr.preferredChannel ?? "EMAIL",
        });
      })
      .catch((err) => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put("/student/profile", {
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim() || undefined,
        college: profile.college.trim() || undefined,
      });
      await refresh();
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePrefsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prefs.whatsappOptIn && !profile.phone.trim()) {
      toast.error("Please add a phone number in your profile to enable WhatsApp alerts");
      return;
    }

    setSavingPrefs(true);
    try {
      await api.put("/student/preferences", prefs);
      toast.success("Communication & privacy preferences updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update preferences");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleRequestDeletion() {
    if (!confirm("Are you sure you want to request complete account deletion? This will revoke all consents and queue your records for erasure.")) {
      return;
    }

    try {
      const res = await api.post<any>("/student/delete-request", {});
      setProfile({ ...profile, deletionRequestedAt: res.deletionRequestedAt });
      toast.info("Account deletion requested. All tracking and messaging has been stopped immediately.");
    } catch (err: any) {
      toast.error(err.message || "Could not submit deletion request");
    }
  }

  if (loading) {
    return <div className="h-64 rounded-xl border border-border/60 bg-card/40 animate-pulse" />;
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-border/80 pb-4">
        <h1 className="text-2xl font-bold font-display">Profile & Privacy Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage your personal details, privacy controls, and communication options.
        </p>
      </div>

      {profile.deletionRequestedAt && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Account Deletion Pending</span>
            <p className="mt-0.5 leading-relaxed text-destructive/90">
              You requested account deletion. Tracking and outgoing messaging are completely disabled. An administrator will purge your data in accordance with our data retention schedule.
            </p>
          </div>
        </div>
      )}

      {/* 1. Profile Information */}
      <form onSubmit={handleProfileSubmit} className="rounded-xl border border-border/80 bg-card p-6 space-y-4">
        <h2 className="text-base font-bold text-foreground">1. Student Profile</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground">Full Name *</label>
            <input
              type="text"
              required
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="field mt-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">Email Address</label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="field mt-1 text-xs bg-secondary/50 text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground">College / University</label>
            <input
              type="text"
              value={profile.college}
              onChange={(e) => setProfile({ ...profile, college: e.target.value })}
              placeholder="e.g. National Institute of Technology"
              className="field mt-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">Phone Number</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+91 9876543210"
              className="field mt-1 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={savingProfile} className="btn-primary btn-sm">
            <span>{savingProfile ? "Saving..." : "Save Profile"}</span>
          </button>
        </div>
      </form>

      {/* 2. Privacy & Communication Consent */}
      <form onSubmit={handlePrefsSubmit} className="rounded-xl border border-border/80 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">2. Communication & Privacy Controls</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          You control how we interact with you. We adhere strictly to explicit opt-in principles.
        </p>

        <div className="space-y-3 pt-2 text-xs">
          <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3">
            <input
              type="checkbox"
              checked={prefs.activityConsent}
              onChange={(e) => setPrefs({ ...prefs, activityConsent: e.target.checked })}
              className="mt-0.5 rounded border-input"
            />
            <div>
              <span className="font-semibold text-foreground">Activity & Recommendation Tracking</span>
              <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                Allows us to track the categories and stacks you browse to generate tailored project recommendations.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3">
            <input
              type="checkbox"
              checked={prefs.emailOptIn}
              onChange={(e) => setPrefs({ ...prefs, emailOptIn: e.target.checked })}
              className="mt-0.5 rounded border-input"
            />
            <div>
              <span className="font-semibold text-foreground">Email Notifications & Digest</span>
              <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                Receive periodic email alerts about new projects that match your academic focus.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3">
            <input
              type="checkbox"
              checked={prefs.whatsappOptIn}
              onChange={(e) => setPrefs({ ...prefs, whatsappOptIn: e.target.checked })}
              className="mt-0.5 rounded border-input"
            />
            <div>
              <span className="font-semibold text-foreground">WhatsApp Project Alerts</span>
              <p className="text-muted-foreground mt-0.5 text-[0.6875rem]">
                Receive direct project notifications and enquiry updates over WhatsApp (requires valid phone number).
              </p>
            </div>
          </label>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-medium text-foreground">Preferred Contact Channel</label>
          <select
            value={prefs.preferredChannel}
            onChange={(e) => setPrefs({ ...prefs, preferredChannel: e.target.value })}
            className="field mt-1 text-xs max-w-xs"
          >
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={savingPrefs} className="btn-primary btn-sm">
            <span>{savingPrefs ? "Saving..." : "Save Privacy Preferences"}</span>
          </button>
        </div>
      </form>

      {/* 3. Right to be Forgotten */}
      <div className="rounded-xl border border-destructive/30 bg-card p-6">
        <h2 className="text-base font-bold text-destructive flex items-center gap-2">
          <Trash2 className="size-4" />
          <span>Right to Deletion (GDPR / DPDP)</span>
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Under our privacy commitments, you have the full right to delete your student account and have all personal activity history expunged.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleRequestDeletion}
            disabled={profile.deletionRequestedAt !== null}
            className="btn-danger btn-sm"
          >
            {profile.deletionRequestedAt ? "Deletion Requested" : "Request Account & Data Deletion"}
          </button>
        </div>
      </div>
    </div>
  );
}

