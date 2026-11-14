import Link from "next/link";
import { Mail, MessageCircle, MapPin, Clock, Send, MessageSquare } from "lucide-react";
import { site } from "@/lib/site";

export const metadata = {
  title: "Contact Us",
  description: "Get in touch with the ProjectShelf team for student project enquiries, academic partnerships, or technical support.",
};

export default function ContactPage() {
  return (
    <div className="page py-10 sm:py-16 max-w-4xl">
      <div className="max-w-2xl">
        <p className="ref">Get in Touch</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Contact ProjectShelf</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Have a question about a project, need help with your viva preparation, or interested in university collaboration? Reach out to us.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {/* Contact Info Cards */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Email Support</h3>
            <p className="mt-1 text-xs text-muted-foreground">For general queries, student enquiries, and billing assistance.</p>
            <a href="mailto:support@projectshelf.com" className="mt-3 block font-mono text-sm font-semibold text-primary hover:underline">
              support@projectshelf.com
            </a>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageCircle className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold">WhatsApp Mentorship</h3>
            <p className="mt-1 text-xs text-muted-foreground">Fast, asynchronous doubt resolution for registered students.</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Available Monday through Saturday, 9:00 AM – 8:00 PM IST.
            </p>
            <Link href="/enquire" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
              <span>Submit a WhatsApp enquiry</span>
              <span>→</span>
            </Link>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-bold">Response Time</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We read every enquiry and usually reply within one working day.
            </p>
          </div>
        </div>

        {/* Quick Help / Direct Link */}
        <div className="flex flex-col justify-between rounded-xl border border-primary/20 bg-primary/5 p-8">
          <div>
            <p className="ref text-primary">Looking for Academic Guidance?</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Need help with a specific project?</h2>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              If you have already identified a project from our catalogue and need assistance with setup, custom features, or viva voce preparation, submitting an enquiry via our dedicated form gets you routed directly to the right engineering mentor.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Link href="/enquire" className="btn-primary w-full">
              <MessageSquare className="size-4" />
              <span>Submit an Academic Enquiry</span>
            </Link>
            <Link href="/projects" className="btn-outline w-full text-xs">
              Explore Project Catalogue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

