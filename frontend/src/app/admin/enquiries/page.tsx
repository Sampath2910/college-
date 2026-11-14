"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RotateCw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";

type AdminEnquiry = {
  id: number;
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  college: string | null;
  projectTitle: string | null;
  serviceType: string;
  requirements: string;
  preferredChannel: string;
  status: string;
  createdAt: string;
};

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<AdminEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status and note states
  const [noteText, setNoteText] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteScope, setQuoteScope] = useState("");

  function loadEnquiries() {
    setLoading(true);
    api.get<any>("/admin/enquiries")
      .then((data) => {
        setEnquiries(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      })
      .catch((err) => toast.error("Could not load enquiries"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEnquiries();
  }, []);

  async function openDetail(id: number) {
    setDetailLoading(true);
    try {
      const data = await api.get<any>(`/admin/enquiries/${id}`);
      setSelectedEnquiry({ ...data.enquiry, projectTitle: data.project?.title ?? null, notes: data.notes, quotations: data.quotations,
        messages: data.messages, consent: data.consent, emailReady: data.emailReady });
    } catch (err: any) {
      toast.error("Could not load enquiry details");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!selectedEnquiry) return;
    try {
      await api.put(`/admin/enquiries/${selectedEnquiry.id}`, { status: newStatus, followUpDate: selectedEnquiry.followUpDate ?? null });
      toast.success(`Status updated to ${newStatus}`);
      openDetail(selectedEnquiry.id);
      loadEnquiries();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  async function handleAddNote() {
    if (!noteText.trim() || !selectedEnquiry) return;
    try {
      await api.post(`/admin/enquiries/${selectedEnquiry.id}/notes`, { note: noteText.trim() });
      toast.success("Note added");
      setNoteText("");
      openDetail(selectedEnquiry.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to add note");
    }
  }

  async function handleSendReply() {
    if (!replyBody.trim() || !selectedEnquiry) return;
    try {
      await api.post(`/admin/enquiries/${selectedEnquiry.id}/email`, {
        subject: `Update regarding your enquiry ${selectedEnquiry.reference}`,
        body: replyBody.trim(),
      });
      toast.success("Email accepted by the provider");
      setReplyBody("");
      openDetail(selectedEnquiry.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    }
  }

  async function handleCreateQuotation() {
    if (!quoteAmount || !selectedEnquiry) return;
    try {
      await api.post(`/admin/enquiries/${selectedEnquiry.id}/quotations`, {
        amount: parseFloat(quoteAmount),
        currency: "INR",
        description: quoteScope.trim() || null,
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      });
      toast.success("Quotation recorded. Send it to the student by email when ready.");
      setQuoteAmount("");
      setQuoteScope("");
      openDetail(selectedEnquiry.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to issue quotation");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Student Enquiries & Mentorship Requests</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage incoming academic queries, issue quotations, review notes, and reply via Email/WhatsApp.
          </p>
        </div>

        <button type="button" onClick={loadEnquiries} className="btn-outline btn-sm">
          <RotateCw className="size-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Enquiries Table */}
        <div className={`space-y-4 ${selectedEnquiry ? "lg:col-span-6" : "lg:col-span-12"}`}>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-secondary/40 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Ref & Student</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading enquiries...
                    </td>
                  </tr>
                ) : enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      No student enquiries received yet.
                    </td>
                  </tr>
                ) : (
                  enquiries.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => openDetail(e.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedEnquiry?.id === e.id ? "bg-primary/5" : "hover:bg-secondary/20"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-primary block">{e.reference}</span>
                        <span className="font-semibold">{e.name}</span>
                        <span className="block text-[0.6875rem] text-muted-foreground">{e.email}</span>
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {e.serviceType.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {e.preferredChannel}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 font-mono text-[0.6875rem] font-bold ${
                          e.status === "NEW" ? "bg-ochre-soft text-ochre" : e.status === "QUOTED" ? "bg-primary/10 text-primary" : "bg-secondary"
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="btn-outline btn-sm h-7 px-2 text-[0.6875rem]">
                          Details →
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected Enquiry Detail Panel */}
        {selectedEnquiry && (
          <div className="lg:col-span-6 rounded-xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div>
                <span className="font-mono font-bold text-primary text-base">{selectedEnquiry.reference}</span>
                <span className="text-xs text-muted-foreground block">
                  Submitted {fmtDate(selectedEnquiry.createdAt)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="rounded p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Student Bio */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border/70 bg-secondary/20 p-4 text-xs">
              <div>
                <span className="text-muted-foreground text-[0.6875rem] block">Student Name</span>
                <span className="font-bold text-foreground">{selectedEnquiry.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[0.6875rem] block">Email</span>
                <span className="font-mono">{selectedEnquiry.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[0.6875rem] block">Phone / WhatsApp</span>
                <span className="font-mono">{selectedEnquiry.phone ?? "Not provided"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[0.6875rem] block">College</span>
                <span>{selectedEnquiry.college ?? "Not provided"}</span>
              </div>
            </div>

            {/* Requirements Text */}
            <div className="space-y-1">
              <span className="ref">Requirements & Scope</span>
              <div className="rounded-lg border border-border/70 bg-card p-3 text-xs leading-relaxed whitespace-pre-line">
                {selectedEnquiry.requirements}
              </div>
            </div>

            {/* Status Update Dropdown */}
            <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
              <span className="text-xs font-medium">Update Status:</span>
              <select
                value={selectedEnquiry.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="field h-8 text-xs max-w-xs"
              >
                <option value="NEW">NEW</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="QUOTED">QUOTED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            {/* Issue Formal Quotation */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <span className="font-bold text-xs block text-foreground">Issue Academic Quotation</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="Amount in INR (e.g. 1999)"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="field h-8 text-xs"
                />
                <input
                  type="text"
                  placeholder="Scope summary..."
                  value={quoteScope}
                  onChange={(e) => setQuoteScope(e.target.value)}
                  className="field h-8 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateQuotation}
                className="btn-primary btn-sm text-xs"
              >
                Create & Email Quotation
              </button>
            </div>

            {/* Reply to Student */}
            <div className="space-y-2 border-t border-border/60 pt-4">
              <span className="ref">Send Reply to Student</span>
              <textarea
                rows={3}
                placeholder="Write your email response here..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="field text-xs"
              />
              <button
                type="button"
                onClick={handleSendReply}
                className="btn-outline btn-sm text-xs"
              >
                <Send className="size-3" />
                <span>Send Email</span>
              </button>
            </div>

            {/* Internal Notes */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <span className="ref">Internal Staff Notes</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add private note (visible to admins only)..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="field h-8 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="btn-outline btn-sm text-xs"
                >
                  Add Note
                </button>
              </div>

              {selectedEnquiry.notes && selectedEnquiry.notes.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {selectedEnquiry.notes.map((n: any) => (
                    <div key={n.id} className="rounded bg-secondary/40 p-2 text-[0.6875rem]">
                      <span className="font-semibold text-primary">{n.author ?? "Admin"}</span>: {n.note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

