//app/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import { listContracts, ContractSummary } from "@/lib/api";
import { Eye, Upload, AlertTriangle, CheckCircle2, Loader2, Clock } from "lucide-react";
import clsx from "clsx";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "#6B6860", bg: "#F3F2EF", icon: Clock },
  processing: { label: "Parsing",    color: "#1D4ED8", bg: "#EFF6FF", icon: Loader2 },
  completed:  { label: "Completed",  color: "#1A6B4A", bg: "#EBF5F0", icon: CheckCircle2 },
  failed:     { label: "Failed",     color: "#B91C1C", bg: "#FEF2F2", icon: AlertTriangle },
};

export default function DashboardPage() {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    listContracts(0, 50)
      .then((r) => setContracts(r.contracts))
      .finally(() => setLoading(false));
  }, []);

  const completed   = contracts.filter((c) => c.status === "completed").length;
  const needsReview = contracts.filter((c) => c.status === "processing" || c.status === "pending").length;
  const failed      = contracts.filter((c) => c.status === "failed").length;

  return (
    <AppShell>
      <div className="animate-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Track and manage your contract parsing pipeline
            </p>
          </div>
          <Link
            href="/upload"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Upload className="w-4 h-4" />
            Upload Contract
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={contracts.length} sub="All time" />
          <StatCard label="Completed" value={completed} subPositive sub={completed > 0 ? "Processed" : "—"} />
          <StatCard label="In Progress" value={needsReview} sub={needsReview > 0 ? "Processing" : "Queue empty"} />
          <StatCard label="Failed" value={failed} sub={failed > 0 ? "Needs attention" : "None"} />
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All Contracts</h2>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="w-4 h-4 spinner" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>No contracts yet.</p>
              <Link href="/upload" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                Upload your first contract →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid var(--border)`, background: "var(--bg)" }}>
                  {["Filename", "Uploaded", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c, i) => {
                  const s = statusConfig[c.status] || statusConfig.pending;
                  const Icon = s.icon;
                  return (
                    <tr
                      key={c.id}
                      className="group cursor-pointer"
                      style={{ borderBottom: i < contracts.length - 1 ? `1px solid var(--border)` : "none" }}
                      onClick={() => router.push(`/contracts/${c.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {c.filename}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ color: s.color, background: s.bg }}>
                          <Icon className={clsx("w-3 h-3", c.status === "processing" && "spinner")} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-opacity"
                          style={{ color: "var(--text-muted)" }}
                          onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${c.id}`); }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}