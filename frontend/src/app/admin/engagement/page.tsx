"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  Clock,
  Mail,
  MessageSquare,
  RotateCw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type Draft = {
  id: number;
  userId: number;
  recipient: string;
  channel: string;
  subject: string;
  body: string;
  triggerKind: string;
  status: string;
  createdAt: string;
};

type StudentProfile = {
  id: number;
  email: string;
  fullName: string;
  topCategories: string[];
  preferredChannel: string;
  activityConsent: boolean;
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  lastActiveAt: string | null;
};

export default function AdminEngagementPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get<(Draft & { studentEmail: string; triggerReason: string })[]>("/admin/engagement/drafts")
        .then((rows) => rows.map((d) => ({ ...d, recipient: d.studentEmail, triggerKind: d.triggerReason }))),
      api.get<(StudentProfile & { lastActivityAt: string | null; likelyCategories: string | null })[]>("/admin/engagement/students")
        .then((rows) => rows.map((s) => ({
          ...s,
          lastActiveAt: s.lastActivityAt,
          preferredChannel: s.emailOptIn ? "EMAIL" : s.whatsappOptIn ? "WHATSAPP" : "None",
          topCategories: s.likelyCategories ? (JSON.parse(s.likelyCategories) as string[]) : [],
        }))),
    ])
      .then(([d, s]) => {
        setDrafts(Array.isArray(d) ? d : []);
        setStudents(Array.isArray(s) ? s : []);
      })
      .catch((err) => toast.error("Could not load engagement data"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDraftAction(id: number, action: string) {
    try {
      await api.post(`/admin/engagement/drafts/${id}/action`, { action });
      toast.success(`Draft ${action}d successfully`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process draft");
    }
  }

  async function handleGenerateDrafts() {
    setGenerating(true);
    try {
      await api.post("/admin/engagement/drafts/generate", {});
      toast.success("Draft generation job dispatched");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate drafts");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display">AI Student Engagement Agent</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Personalised project recommendation drafts, student interest profiles, and opt-in communication management.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerateDrafts}
            className="btn-primary btn-sm"
          >
            <Sparkles className="size-3.5" />
            <span>{generating ? "Generating..." : "Generate AI Drafts"}</span>
          </button>
          <button type="button" onClick={loadData} className="btn-outline btn-sm">
            <RotateCw className="size-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 1. Pending Message Drafts Awaiting Human Approval */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            <h2 className="text-sm font-bold">Message Drafts Awaiting Review ({drafts.filter(d => d.status === "DRAFT").length})</h2>
          </div>
          <span className="text-[0.6875rem] text-muted-foreground">Human-in-the-loop: No message is dispatched without admin approval.</span>
        </div>

        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
            <Bot className="size-8 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">No pending drafts. Click "Generate AI Drafts" to create recommendations for active students.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {drafts.map((d) => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{d.channel}</span>
                    <span className="text-xs text-muted-foreground">• To: {d.recipient}</span>
                  </div>
                  <span className="rounded bg-ochre-soft px-1.5 py-0.5 font-mono text-[0.625rem] text-ochre font-bold">
                    {d.status}
                  </span>
                </div>

                <div className="font-semibold text-xs text-foreground">{d.subject}</div>

                <div className="rounded-md border border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed text-foreground/80 whitespace-pre-line max-h-40 overflow-y-auto">
                  {d.body}
                </div>

                {d.status === "DRAFT" && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => handleDraftAction(d.id, "reject")}
                      className="btn-danger btn-sm h-7 text-xs"
                    >
                      <X className="size-3" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDraftAction(d.id, "approve")}
                      className="btn-primary btn-sm h-7 text-xs"
                    >
                      <Check className="size-3" />
                      <span>Approve & Dispatch</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Consented Student Profiles */}
      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="text-sm font-bold">Registered Students & Interest Profiles ({students.length})</h2>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/40 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Consents</th>
                <th className="px-4 py-3">Top Interests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No student accounts registered yet.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <span className="font-semibold block">{st.fullName}</span>
                      <span className="text-[0.6875rem] text-muted-foreground font-mono">{st.email}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">{st.preferredChannel}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 font-mono text-[0.625rem]">
                        <span className={`rounded px-1.5 py-0.5 ${st.activityConsent ? "bg-primary/10 text-primary font-bold" : "bg-secondary text-muted-foreground"}`}>
                          ACT: {st.activityConsent ? "YES" : "NO"}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 ${st.emailOptIn ? "bg-primary/10 text-primary font-bold" : "bg-secondary text-muted-foreground"}`}>
                          EM: {st.emailOptIn ? "YES" : "NO"}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 ${st.whatsappOptIn ? "bg-primary/10 text-primary font-bold" : "bg-secondary text-muted-foreground"}`}>
                          WA: {st.whatsappOptIn ? "YES" : "NO"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {st.topCategories && st.topCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {st.topCategories.map((c, i) => (
                            <span key={i} className="rounded bg-secondary px-1.5 py-0.5 text-[0.6875rem]">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground">No activity recorded</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

