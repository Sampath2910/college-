/** Public site configuration. Everything here is safe to ship to the browser. */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "ProjectShelf",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Business WhatsApp number in international format, digits only. Empty hides every WhatsApp button. */
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  tagline: "A catalogue of open-source projects for college students",
};

/** Click-to-chat link. This only opens WhatsApp on the visitor's own device; nothing is sent by us. */
export function whatsappLink(text: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
