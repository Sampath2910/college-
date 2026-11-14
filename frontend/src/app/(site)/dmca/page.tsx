"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck, AlertCircle, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function DmcaPage() {
  const [loading, setLoading] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    claimantName: "",
    claimantEmail: "",
    originalWorkUrl: "",
    claimType: "ATTRIBUTION",
    statement: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.claimantName.trim() || !formData.claimantEmail.trim() || !formData.originalWorkUrl.trim() || !formData.statement.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ reference: string }>("/public/dmca", {
        claimantName: formData.claimantName.trim(),
        claimantEmail: formData.claimantEmail.trim(),
        originalWorkUrl: formData.originalWorkUrl.trim(),
        claimType: formData.claimType,
        statement: formData.statement.trim(),
      });

      setSubmittedRef(res.reference);
      toast.success(`Attribution request received! Reference: ${res.reference}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="size-3.5" /> Legal & Open-Source Compliance
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          Open-Source Attribution & DMCA Notice
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
          ProjectShelf is committed to ethical open-source curation, researcher attribution, and fair academic use.
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        <h2 className="text-lg font-bold text-foreground">Our Academic Fair-Use Policy</h2>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            ProjectShelf provides educational reference architectures, setup guidance and documentation help to help university students learn modern software engineering principles.
          </p>
          <p>
            We strictly respect original intellectual property:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-foreground/80">
            <li>All downloaded code bundles retain original author names, copyright notices, and open-source licenses (MIT, Apache 2.0, GPL, BSD).</li>
            <li>We do not claim proprietary copyright over third-party open-source codebases.</li>
            <li>Our commercial services charge exclusively for <strong>academic readiness</strong> (custom database seed scripts, report formatting help, presentation slide deck authoring, and 1-on-1 viva voce mentoring).</li>
          </ul>
        </div>
      </div>

      {submittedRef ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>
          <h3 className="mt-4 text-2xl font-bold">Attribution Notice Logged</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Reference Number: <span className="font-mono font-bold text-foreground">{submittedRef}</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Our compliance team will review your statement and update our catalogue records within 24–48 business hours. You will receive an official response at {formData.claimantEmail}.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmittedRef(null);
              setFormData({ claimantName: "", claimantEmail: "", originalWorkUrl: "", claimType: "ATTRIBUTION", statement: "" });
            }}
            className="mt-6 rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
          >
            Submit Another Request
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
          <h2 className="text-lg font-bold">Submit Attribution or Takedown Notice</h2>

          <div>
            <label className="text-xs font-medium text-foreground">
              Your Full Legal Name or Organization <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.claimantName}
              onChange={(e) => setFormData({ ...formData, claimantName: e.target.value })}
              placeholder="e.g. Linus Torvalds / Research Lab"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Contact Email Address <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.claimantEmail}
              onChange={(e) => setFormData({ ...formData, claimantEmail: e.target.value })}
              placeholder="author@institution.edu or github-associated email"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Original Work / Repository URL <span className="text-destructive">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.originalWorkUrl}
              onChange={(e) => setFormData({ ...formData, originalWorkUrl: e.target.value })}
              placeholder="https://github.com/your-username/your-repository"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Notice Type</label>
            <select
              value={formData.claimType}
              onChange={(e) => setFormData({ ...formData, claimType: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
            >
              <option value="ATTRIBUTION">Update Author Attribution / Website Link</option>
              <option value="LICENSE_UPDATE">Clarify License & Usage Constraints</option>
              <option value="TAKEDOWN">Request Catalogue Delisting / Removal</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">
              Statement of Claim & Verification Details <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={formData.statement}
              onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
              placeholder="Please provide details proving authorship or describing the desired attribution update..."
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-md transition hover:opacity-95 disabled:opacity-60"
            >
              <Send className="size-4" />
              {loading ? "Submitting Notice..." : "Submit Notice to Compliance Team"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
