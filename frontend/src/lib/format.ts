/** Backend timestamps are UTC; some arrive without a zone suffix. */
export function toDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(value) || !value.includes("T") ? value : value + "Z");
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value: string | null | undefined) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
}

export function fmtDateTime(value: string | null | undefined) {
  const d = toDate(value);
  return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
}

export function fmtNumber(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

/** "PENDING_REVIEW" -> "Pending review" */
export function humanise(s: string | null | undefined) {
  if (!s) return "—";
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
