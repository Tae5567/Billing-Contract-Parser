"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { listContracts, getContract, AuditEntry, ContractSummary } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface AuditWithContract extends AuditEntry {
  contractName: string;
  contractId: string;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditWithContract[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { contracts } = await listContracts(0, 50);
        const all: AuditWithContract[] = [];

        await Promise.all(
          contracts
            .filter(c => c.status === "completed")
            .map(async (c: ContractSummary) => {
              try {
                const full = await getContract(c.id);
                full.audit_log.forEach(entry => {
                  all.push({ ...entry, contractName: c.filename, contractId: c.id });
                });
              } catch {}
            })
        );

        all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setEntries(all);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const actionColor: Record<string, { color: string; bg: string; symbol: string }> = {
    extracted: { color: "var(--accent)",   bg: "var(--accent-light)",  symbol: "→" },
    edited:    { color: "var(--warning)",  bg: "var(--warning-light)", symbol: "✎" },
    exported:  { color: "#7C3AED",         bg: "#F5F3FF",              symbol: "↓" },
  };

  return (
    <AppShell>
      <div className="animate-in">
        <div className="mb-8">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Audit Log</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Complete history of all contract processing activities
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-16 justify-center" style={{ color: "var(--text-muted)" }}>
            <Loader2 className="w-4 h-4 spinner" />
            <span className="text-sm">Loading audit log...</span>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ color: "var(--text-muted)" }}>
            No audit entries yet. Process a contract to see its history here.
          </p>
        ) : (
          <div className="max-w-3xl space-y-2">
            {entries.map((entry) => {
              const style = actionColor[entry.action] || actionColor.exported;
              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  onClick={() => router.push(`/contracts/${entry.contractId}`)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-medium"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {style.symbol}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-medium capitalize" style={{ color: "var(--text-primary)" }}>
                        {entry.action}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {entry.field_name}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                      {entry.contractName}
                    </p>
                    {entry.reason && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{entry.reason}</p>
                    )}
                    {entry.action === "edited" && (
                      <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
                        {JSON.stringify(entry.old_value)} → {JSON.stringify(entry.new_value)}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}