"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function EnquirePage() {
  const { me } = useAuth();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: me?.fullName ?? "",
    email: me?.email ?? "",
    phone: "",
    college: "",
    serviceType: "GENERAL",
    preferredTechnology: "",
    preferredChannel: "EMAIL",
    requirements: "",
    contactConsent: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.contactConsent) {
      toast.error("Please provide consent to contact you regarding this enquiry.");
      return;
    }
    if (formData.requirements.trim().length < 20) {
      toast.error("Please describe your requirements in at least 20 characters.");
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
        serviceType: formData.serviceType,
        preferredTechnology: formData.preferredTechnology.trim() || undefined,
        preferredChannel: formData.preferredChannel,
        requirements: formData.requirements.trim(),
        contactConsent: true,
        website: "", // Honeypot field
      };

      const res = await api.post<{ reference: string }>("/public/enquiries", payload);
      setSubmitted(res.reference);
      toast.success(`Enquiry submitted! Your reference is ${res.reference}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit enquiry. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page py-10 sm:py-16 max-w-3xl">
      <div className="border-b border-border/80 pb-6">
        <p className="ref">Student Enquiries</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Request Academic Assistance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fill out the form below. Our engineering mentors will review your topic and get back to you with guidance and quotations.
        </p>
      </div>

      {submitted ? (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-primary/20 bg-card p-10 text-center shadow-xs">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Enquiry Submitted Successfully</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your tracking reference number is:
          </p>
          <div className="mt-2 rounded-md bg-secondary px-4 py-2 font-mono text-lg font-bold text-primary">
            {submitted}
          </div>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
            A confirmation has been recorded. Our team will review your college requirements and contact you via your chosen channel with next steps.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/projects" className="btn-primary">
              Browse More Projects
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(null);
                setFormData({ ...formData, requirements: "" });
              }}
              className="btn-outline"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 space-y-5">
            <h2 className="text-base font-bold text-foreground">1. Contact Information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-foreground">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Priya Patel"
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
                  placeholder="priya@college.edu"
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
                  placeholder="e.g. IIT Bombay, Anna University, etc."
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
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 space-y-5">
            <h2 className="text-base font-bold text-foreground">2. Project Details</h2>

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
                  <option value="GENERAL">General Project Guidance / Selection</option>
                  <option value="SETUP_ASSISTANCE">Environment Setup & Execution</option>
                  <option value="VIVA_PREPARATION">Viva Voce Preparation & Q&A</option>
                  <option value="CODE_WALKTHROUGH">Code Walkthrough & Architecture Explanation</option>
                  <option value="CUSTOMISATION">Custom Module Development</option>
                  <option value="FULL_IMPLEMENTATION">Complete Project Implementation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground">Preferred Technology / Stack</label>
                <input
                  type="text"
                  value={formData.preferredTechnology}
                  onChange={(e) => setFormData({ ...formData, preferredTechnology: e.target.value })}
                  placeholder="e.g. Python, Spring Boot, React, Flutter..."
                  className="field mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground">
                Describe your requirements, university guidelines, or deadlines *
              </label>
              <textarea
                required
                minLength={20}
                rows={4}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Give details about your semester, submission date, problem statement, or specific roadblocks you are facing..."
                className="field mt-1 text-xs"
              />
              <span className="mt-1 block text-[0.6875rem] text-muted-foreground">Minimum 20 characters required.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground">Preferred Contact Method *</label>
              <div className="mt-2 flex gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="preferredChannel"
                    value="EMAIL"
                    checked={formData.preferredChannel === "EMAIL"}
                    onChange={() => setFormData({ ...formData, preferredChannel: "EMAIL" })}
                  />
                  <span>Email</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="preferredChannel"
                    value="WHATSAPP"
                    checked={formData.preferredChannel === "WHATSAPP"}
                    onChange={() => setFormData({ ...formData, preferredChannel: "WHATSAPP" })}
                  />
                  <span>WhatsApp</span>
                </label>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-muted-foreground pt-2">
              <input
                type="checkbox"
                checked={formData.contactConsent}
                onChange={(e) => setFormData({ ...formData, contactConsent: e.target.checked })}
                className="mt-0.5 rounded border-input"
              />
              <span>
                I agree to allow ProjectShelf to store my details and contact me regarding this enquiry. We value your privacy and never share your data with advertisers.
              </span>
            </label>
          </div>

          {/* Honeypot */}
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="flex justify-end gap-3">
            <Link href="/" className="btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              <Send className="size-4" />
              <span>{loading ? "Submitting..." : "Submit Enquiry"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

