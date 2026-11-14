"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Download, ExternalLink, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { OrderRecord } from "@/lib/types";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  function loadOrders() {
    setLoading(true);
    api
      .get<{ content: OrderRecord[] }>("/admin/orders")
      .then((res) => setOrders(res.content || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function markPaid(reference: string) {
    if (!window.confirm(`Confirm that payment for ${reference} has been received? This releases the files to the student.`)) return;
    try {
      await api.post(`/admin/orders/${reference}/mark-paid`);
      loadOrders();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not update the order.");
    }
  }

  const filtered = orders.filter((o) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      o.orderReference.toLowerCase().includes(term) ||
      o.studentName.toLowerCase().includes(term) ||
      o.studentEmail.toLowerCase().includes(term) ||
      o.projectTitle.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Orders & Sales</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Monitor real-time student purchases, package tiers, and generated download links.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-2 text-sm max-w-sm">
        <Search className="size-4 text-muted-foreground" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by order ref, student, project..."
          className="w-full bg-transparent text-xs focus:outline-hidden"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Student & College</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Downloads</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="inline-block size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const isPaid = o.status === "PAID";
                  return (
                    <tr key={o.orderReference} className="hover:bg-secondary/20">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        <Link
                          href={`/order/${o.orderReference}`}
                          target="_blank"
                          className="hover:underline text-primary inline-flex items-center gap-1"
                        >
                          {o.orderReference}
                          <ExternalLink className="size-3 opacity-60" />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{o.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {o.studentEmail} {o.studentCollege ? `• ${o.studentCollege}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[180px] truncate">
                        {o.projectTitle}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {o.packageType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        ₹{o.amountInr}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                          {o.status}
                        </span>
                      {!isPaid && (
                          <button type="button" onClick={() => markPaid(o.orderReference)} className="btn-outline btn-sm mt-1.5 block">
                            Mark as paid
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {o.downloads ? `${o.downloads.length} generated` : "0"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

