"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";

type Value = string | number | boolean | null | string[] | Record<string, number>;
type Settings = Record<string, Value>;

/** Settings grouped by key prefix, with a plain-language label for each. Types come from the values the API returns. */
const GROUPS: [string, string, [string, string][]][] = [
  ["Discovery", "What the Discovery Agent searches for and how much it fetches per run.", [
    ["discovery.github.keywords", "GitHub search keywords (one per line)"],
    ["discovery.github.minStars", "GitHub: minimum stars"],
    ["discovery.github.maxStars", "GitHub: maximum stars (0 = no limit)"],
    ["discovery.kaggle.keywords", "Kaggle search keywords (one per line)"],
    ["discovery.kaggle.kinds", "Kaggle resource kinds (dataset, notebook, model, competition)"],
    ["discovery.kaggle.minVotes", "Kaggle: minimum votes"],
    ["discovery.maxPerKeyword", "Maximum results per keyword"],
    ["discovery.maxPerRun", "Maximum records per run"],
    ["discovery.minDescriptionLength", "Minimum description length (characters)"],
    ["discovery.maxAgeYears", "Reject repositories not updated for this many years"],
  ]],
  ["Quality and publishing", "Scores are internal. They are never shown on the public site.", [
    ["quality.minScore", "Reject below this score (0-100)"],
    ["quality.weights", "Score weights"],
    ["duplicates.threshold", "Duplicate similarity threshold (0-1)"],
    ["autopublish.enabled", "Allow automatic publishing (also needs enabling per source)"],
  ]],
  ["AI usage", "Limits and prices used for the cost estimate. Leave prices empty until you have checked the provider's price list.", [
    ["ai.enabled", "Use AI analysis and drafting when the AI service is configured"],
    ["ai.maxCallsPerDay", "Maximum AI calls per day"],
    ["ai.price.inputPerMTok", "Input price, USD per million tokens"],
    ["ai.price.outputPerMTok", "Output price, USD per million tokens"],
  ]],
  ["Engagement and messaging", "Rules every outgoing message must pass, in addition to the student's own opt-in.", [
    ["engagement.autoSend", "Send approved-by-rule drafts automatically (off = every message needs your approval)"],
    ["engagement.maxMessagesPerWeek", "Maximum messages per student per week"],
    ["engagement.quietStart", "Quiet hours start (HH:MM)"],
    ["engagement.quietEnd", "Quiet hours end (HH:MM)"],
    ["engagement.timezone", "Time zone for quiet hours"],
    ["email.dailyLimit", "Maximum emails per day"],
  ]],
  ["Schedules", "Cron with 6 fields: second minute hour day month weekday. Leave empty to disable a schedule.", [
    ["schedules.paused", "Pause all scheduled jobs"],
    ["schedule.GITHUB_DISCOVERY", "GitHub discovery"],
    ["schedule.KAGGLE_DISCOVERY", "Kaggle discovery"],
    ["schedule.METADATA_UPDATE", "Metadata update"],
    ["schedule.SOURCE_VALIDATION", "Source link check"],
    ["schedule.DEMO_VALIDATION", "Demo link check"],
    ["schedule.DUPLICATE_DETECTION", "Duplicate detection"],
    ["schedule.SCORE_RECALCULATION", "Score recalculation"],
    ["schedule.INTEREST_AGGREGATION", "Interest aggregation"],
    ["schedule.DRAFT_GENERATION", "Draft generation"],
  ]],
];

function Field({ id, label, value, original, onChange }: { id: string; label: string; value: Value; original: Value; onChange: (v: Value) => void }) {
  if (typeof original === "boolean") {
    return (
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span>{label}</span>
      </label>
    );
  }
  if (Array.isArray(original)) {
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
        <textarea id={id} className="field font-mono text-[0.8125rem]" rows={Math.min(8, Math.max(3, (value as string[]).length + 1))}
          value={(value as string[]).join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />
      </div>
    );
  }
  if (original !== null && typeof original === "object") {
    const obj = value as Record<string, number>;
    return (
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{label}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.keys(original).map((k) => (
            <label key={k} className="text-xs text-muted-foreground">
              {k}
              <input type="number" min={0} className="field mt-1" value={obj[k] ?? 0} onChange={(e) => onChange({ ...obj, [k]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  // number settings (including the nullable prices) vs. text settings
  const numeric = typeof original === "number" || id.startsWith("ai.price.");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input id={id} type={numeric ? "number" : "text"} step="any" min={numeric ? 0 : undefined} className={`field ${numeric ? "max-w-40" : "max-w-sm font-mono text-[0.8125rem]"}`}
        value={value === null ? "" : String(value)}
        onChange={(e) => onChange(numeric ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Settings>("/admin/settings").then((s) => { setSaved(s); setDraft(s); }).catch((e) => toast.error(errorMessage(e)));
  }, []);

  const changed = saved ? Object.keys(draft).filter((k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k])) : [];

  async function save() {
    setSaving(true);
    try {
      // send only what changed; lists are trimmed and empty lines dropped
      const body: Settings = {};
      for (const k of changed) body[k] = Array.isArray(draft[k]) ? (draft[k] as string[]).map((s) => s.trim()).filter(Boolean) : draft[k];
      const next = await api.put<Settings>("/admin/settings", body);
      setSaved(next);
      setDraft(next);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="border-b pb-4">
        <h1 className="text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational rules for discovery, scoring, AI usage, messaging and schedules. API keys are not stored here; see Integrations.</p>
      </div>
      {!saved && <p className="text-sm text-muted-foreground">Loading…</p>}
      {saved && GROUPS.map(([title, help, fields]) => (
        <section key={title} className="rounded-lg border bg-card p-5">
          <h2 className="text-xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {fields.filter(([k]) => k in saved).map(([k, label]) => (
              <div key={k} className={Array.isArray(saved[k]) || (saved[k] !== null && typeof saved[k] === "object") || typeof saved[k] === "boolean" ? "lg:col-span-2" : ""}>
                <Field id={k} label={label} value={draft[k]} original={saved[k]} onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))} />
              </div>
            ))}
          </div>
        </section>
      ))}
      {saved && (
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t bg-card/95 px-6 py-3 backdrop-blur-sm lg:left-64">
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm text-muted-foreground">{changed.length === 0 ? "No unsaved changes" : `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`}</span>
            <button type="button" onClick={() => setDraft(saved)} disabled={changed.length === 0} className="btn-outline btn-sm">Discard</button>
            <button type="button" onClick={save} disabled={changed.length === 0 || saving} className="btn-primary btn-sm">{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
