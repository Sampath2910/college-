"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FileText, MessageSquare, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type StudentEnquiry = {
  id: number;
  reference: string;
  serviceType: string;
  requirements: string;
  preferredChannel: string;
  status: string;
  quotation?: {
    amount: number;
    currency: string;
    scope: string;
    validUntil: string;
  } | null;
  createdAt: string;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "Received", color: "bg-secondary text-foreground" },
  IN_REVIEW: { label: "Under Mentor Review", color: "bg-ochre-soft text-ochre" },
  QUOTED: { label: "Quotation Ready", color: "bg-primary/10 text-primary font-bold" },
  IN_PROGRESS: { label: "In Progress", color: "bg-primary text-primary-foreground" },
  RESOLVED: { label: "Resolved", color: "bg-secondary text-muted-foreground" },
  CLOSED: { label: "Closed", color: "bg-secondary text-muted-foreground" },
};

export default function StudentEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<StudentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<(StudentEnquiry & { quotation?: { description?: string } | null })[]>("/student/enquiries")
      .then((rows) => rows.map((e, i) => ({ ...e, id: e.id ?? i, quotation: e.quotation ? { ...e.quotation, scope: e.quotation.description ?? "" } : null }) as StudentEnquiry))
      .then((data) => setEnquiries(Array.isArray(data) ? data : []))
      .catch(() => setEnquiries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display">My Enquiries & Mentorship</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Track status updates, mentor reviews, and quotations for your requests.
          </p>
        </div>
        <Link href="/enquire" className="btn-primary btn-sm">
          <Plus className="size-3.5" />
          <span>New Enquiry</span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-lg border border-border/50 bg-card/50 animate-pulse" />
          ))}
        </div>
      ) : enquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <MessageSquare className="size-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-bold">No active enquiries</h2>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Have a question about environment setup, viva preparation, or need code customization?
          </p>
          <Link href="/enquire" className="btn-primary btn-sm mt-5">
            Submit an Enquiry
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((e) => {
            const st = STATUS_MAP[e.status] ?? { label: e.status, color: "bg-secondary text-foreground" };
            return (
              <div key={e.id} className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{e.reference}</span>
                    <span className="text-xs text-muted-foreground">• {e.serviceType.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-sm px-2 py-0.5 text-[0.6875rem] font-medium ${st.color}`}>
                      {st.label}
                    </span>
                    <span className="text-xs text-muted-foreground">Submitted {fmtDate(e.createdAt)}</span>
                  </div>
                </div>

                <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line">
                  {e.requirements}
                </div>

                {e.quotation && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">Formal Quotation</span>
                      <span className="font-mono text-sm font-bold text-primary">
                        {e.quotation.currency} {e.quotation.amount}
                      </span>
                    </div>
                    {e.quotation.scope && (
                      <p className="mt-1.5 text-muted-foreground leading-relaxed">{e.quotation.scope}</p>
                    )}
                    {e.quotation.validUntil && (
                      <p className="mt-2 text-[0.6875rem] text-muted-foreground font-mono">
                        Valid until: {e.quotation.validUntil}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

