"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Props = {
  projectId?: number;
  projectTitle?: string;
  className?: string;
  buttonText?: string;
};

export function ProjectEnquiryDrawer({
  projectId,
  projectTitle,
  className = "btn-primary w-full",
  buttonText = "Request Implementation Assistance",
}: Props) {
  const { me } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: me?.fullName ?? "",
    email: me?.email ?? "",
    phone: "",
    college: "",
    serviceType: "SETUP_ASSISTANCE",
    preferredChannel: "EMAIL",
    requirements: projectTitle
      ? `Hi, I am interested in implementing "${projectTitle}" for my college project. I would like help with setting up the project and understanding the architecture.`
      : "",
    contactConsent: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.contactConsent) {
      toast.error("Please provide consent to contact you regarding this enquiry.");
      return;
    }
    if (formData.requirements.trim().length < 20) {
      toast.error("Please describe your project requirements in at least 20 characters.");
      return;
    }
    if (formData.preferredChannel === "WHATSAPP" && !formData.phone.trim()) {
      toast.error("Please provide your WhatsApp phone number.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        college: formData.college.trim() || undefined,
        projectId: projectId ?? undefined,
        serviceType: formData.serviceType,
        preferredChannel: formData.preferredChannel,
        requirements: formData.requirements.trim(),
        contactConsent: true,
        website: "", // Honeypot field
      };

      const res = await api.post<{ reference: string }>("/public/enquiries", payload);
      setSubmitted(res.reference);
      toast.success(`Enquiry submitted successfully! Reference: ${res.reference}`);
    } catch (err: any) {
      toast.error(err.message || "Could not submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        <MessageSquare className="size-4" />
        <span>{buttonText}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSubmitted(null);
              }}
              className="absolute top-4 right-4 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            {submitted ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="mt-4 text-2xl font-bold">Enquiry Received</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your reference ID is <strong className="font-mono text-foreground">{submitted}</strong>.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  We have recorded your request. Our technical mentors will review your requirements and reach out via {formData.preferredChannel === "WHATSAPP" ? "WhatsApp" : "email"} with next steps and guidance.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setSubmitted(null);
                  }}
                  className="btn-primary mt-6"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <p className="ref">Academic Mentorship</p>
                <h3 className="mt-1 text-2xl font-bold">
                  {projectTitle ? `Enquire about: ${projectTitle}` : "Request Project Mentorship"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Need help running this code, setting up databases, or preparing for your viva examination?
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
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
                        placeholder="you@college.edu"
                        className="field mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground">College / University</label>
                      <input
                        type="text"
                        value={formData.college}
                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                        placeholder="e.g. Delhi Technological University"
                        className="field mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground">
                        Phone / WhatsApp {formData.preferredChannel === "WHATSAPP" && "*"}
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 9876543210"
                        className="field mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-foreground">Service Required *</label>
                      <select
                        value={formData.serviceType}
                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                        className="field mt-1 text-xs"
                      >
                        <option value="REPORT_PACK">Academic Report & PPT Pack (₹1,299)</option>
                        <option value="RUN_PACK">Setup & Run Pack (₹699)</option>
                        <option value="VIVA_MENTORSHIP">Complete Viva Defense & Mentorship (₹2,499)</option>
                        <option value="SETUP_ASSISTANCE">Environment Setup & Execution</option>
                        <option value="VIVA_PREPARATION">Viva Voce Preparation & Q&A</option>
                        <option value="CODE_WALKTHROUGH">Code Walkthrough & Explanation</option>
                        <option value="CUSTOMISATION">Custom Module Development</option>
                        <option value="FULL_IMPLEMENTATION">End-to-End Implementation</option>
                        <option value="GENERAL">General Guidance / Consultation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground">Preferred Contact Method *</label>
                      <select
                        value={formData.preferredChannel}
                        onChange={(e) => setFormData({ ...formData, preferredChannel: e.target.value })}
                        className="field mt-1 text-xs"
                      >
                        <option value="EMAIL">Email</option>
                        <option value="WHATSAPP">WhatsApp</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground">Your Requirements / Question *</label>
                    <textarea
                      required
                      minLength={20}
                      rows={3}
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="Specify your university deadlines, target environment, or specific problems you need help with..."
                      className="field mt-1 text-xs"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={formData.contactConsent}
                      onChange={(e) => setFormData({ ...formData, contactConsent: e.target.checked })}
                      className="mt-0.5 rounded border-input"
                    />
                    <span>
                      I agree to let ProjectShelf contact me regarding this enquiry via my selected channel. We respect your privacy and never spam.
                    </span>
                  </label>

                  {/* Honeypot */}
                  <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="btn-outline"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      <Send className="size-3.5" />
                      <span>{loading ? "Submitting..." : "Submit Enquiry"}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

