"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Minus, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";

type Integration = {
  code: string; name: string; enabled: boolean; configured: boolean; worksWithoutCredentials: boolean;
  purpose: string; docsUrl: string; credentialsUrl: string; detail?: string;
  variables: { name: string; note: string; set: boolean }[]; steps: string[];
  lastSuccessAt: string | null; lastFailureAt: string | null; lastFailureMessage: string | null; lastSyncAt: string | null;
};

/** Connection state in words. "Connected" is only ever claimed after a real request to the provider succeeded. */
function state(i: Integration): [string, string] {
  if (!i.enabled) return ["Disabled", "bg-secondary text-muted-foreground"];
  const lastOk = i.lastSuccessAt && (!i.lastFailureAt || i.lastSuccessAt > i.lastFailureAt);
  if (i.lastFailureAt && !lastOk) return ["Last check failed", "bg-destructive/10 text-destructive"];
  if (lastOk) return [i.configured ? "Connected" : "Working without credentials", "bg-primary/10 text-primary"];
  if (!i.configured && !i.worksWithoutCredentials) return ["Needs credentials", "bg-ochre-soft text-ochre"];
  return ["Not tested yet", "bg-secondary text-foreground/80"];
}

export default function AdminIntegrationsPage() {
  const [items, setItems] = useState<Integration[] | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const load = useCallback(() => {
    api.get<Integration[]>("/admin/integrations").then(setItems).catch((e) => toast.error(errorMessage(e)));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    load();
  }, [load]);

  async function test(code: string) {
    setTesting(code);
    try {
      const r = await api.post<{ ok: boolean; message: string }>(`/admin/integrations/${code}/test`);
      setResults((prev) => ({ ...prev, [code]: r }));
      load();
    } catch (e) {
      setResults((prev) => ({ ...prev, [code]: { ok: false, message: errorMessage(e) } }));
    } finally {
      setTesting(null);
    }
  }

  async function toggle(i: Integration) {
    try {
      await api.put(`/admin/integrations/${i.code}`, { enabled: !i.enabled });
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl">Integrations</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Credentials are set as environment variables on the server and are never shown or entered here. This page shows which are present, lets you run a real connection test, and explains how to get each credential.
        </p>
      </div>

      {!items && <p className="text-sm text-muted-foreground">Loading…</p>}

      {items?.map((i) => {
        const [label, style] = state(i);
        const result = results[i.code];
        return (
          <section key={i.code} className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl">{i.name}</h2>
                  <span className={`rounded-sm px-2 py-0.5 font-mono text-[0.6875rem] ${style}`}>{label}</span>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-foreground/75">{i.purpose}</p>
                {i.detail && <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => test(i.code)} disabled={testing === i.code} className="btn-primary btn-sm">
                  <PlugZap aria-hidden /> {testing === i.code ? "Testing…" : "Test connection"}
                </button>
                <button type="button" onClick={() => toggle(i)} className="btn-outline btn-sm">{i.enabled ? "Disable" : "Enable"}</button>
              </div>
            </div>

            {result && (
              <p role="status" className={`mx-5 mb-4 rounded-md border px-3 py-2 text-sm ${result.ok ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                {result.ok ? "Test passed: " : "Test failed: "}{result.message}
              </p>
            )}

            <div className="grid gap-6 border-t p-5 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <h3 className="ref mb-2">Environment variables</h3>
                <ul className="divide-y rounded-md border text-sm">
                  {i.variables.map((v) => (
                    <li key={v.name} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0">
                        <code className="font-mono text-[0.8125rem]">{v.name}</code>
                        <span className="block text-xs text-muted-foreground">{v.note}</span>
                      </span>
                      <span className={`inline-flex shrink-0 items-center gap-1 text-xs ${v.set ? "text-primary" : "text-muted-foreground"}`}>
                        {v.set ? <Check className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
                        {v.set ? "set" : "not set"}
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3"><dt>Last successful connection</dt><dd>{fmtDateTime(i.lastSuccessAt)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Last failure</dt><dd>{fmtDateTime(i.lastFailureAt)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Last synchronisation</dt><dd>{fmtDateTime(i.lastSyncAt)}</dd></div>
                </dl>
                {i.lastFailureMessage && i.lastFailureAt && (
                  <p className="mt-2 text-xs text-destructive [overflow-wrap:anywhere]">Last error: {i.lastFailureMessage}</p>
                )}
              </div>
              <div>
                <h3 className="ref mb-2">How to set it up</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/85">
                  {i.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
                <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <a href={i.credentialsUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">Get credentials <ArrowUpRight className="size-3.5" aria-hidden /></a>
                  <a href={i.docsUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">Official documentation <ArrowUpRight className="size-3.5" aria-hidden /></a>
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
