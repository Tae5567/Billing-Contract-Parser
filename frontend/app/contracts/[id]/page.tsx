//app/contracts/[id]/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getContract, updateField, exportContract, Contract, BillingConfig } from "@/lib/api";
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Download,
  Pencil, Check, X, ChevronDown, ChevronUp, FileJson, FileText as FileCsv
} from "lucide-react";
import clsx from "clsx";

// Confidence badge
function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const isHigh   = score >= 0.9;
  const isMed    = score >= 0.7;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: isHigh ? "var(--accent-light)" : isMed ? "var(--warning-light)" : "var(--danger-light)",
        color: isHigh ? "var(--accent)" : isMed ? "var(--warning)" : "var(--danger)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ background: isHigh ? "var(--accent)" : isMed ? "var(--warning)" : "var(--danger)" }}
      />
      {pct}%
    </span>
  );
}

// Single editable field card
function FieldCard({
  label, value, confidence, sourceText, fieldPath, onSave,
}: {
  label: string;
  value: unknown;
  confidence?: number;
  sourceText?: string;
  fieldPath: string;
  onSave: (path: string, val: string, reason: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value ?? ""));
  const [reason, setReason]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [showSrc, setShowSrc] = useState(false);

  const display = value === null || value === undefined ? "—"
    : typeof value === "boolean" ? (value ? "Yes" : "No")
    : String(value);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(fieldPath, editVal, reason); setEditing(false); setReason(""); }
    finally { setSaving(false); }
  };

  const needsReview = confidence !== undefined && confidence < 0.7;

  return (
    <div
      className="rounded-xl border p-4 group"
      style={{
        background: "var(--surface)",
        borderColor: needsReview ? "#FCA5A5" : "var(--border)",
        borderLeftWidth: needsReview ? "3px" : "1px",
        borderLeftColor: needsReview ? "var(--danger)" : "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          {confidence !== undefined && <ConfidenceBadge score={confidence} />}
          {!editing && (
            <button
              onClick={() => { setEditVal(display === "—" ? "" : display); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2 mt-2">
          <input
            type="text"
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            autoFocus
            className="w-full px-3 py-1.5 text-sm rounded-lg border outline-none"
            style={{ borderColor: "var(--accent)", fontFamily: "'Geist Mono', monospace", background: "var(--bg)" }}
          />
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for change (optional)"
            className="w-full px-3 py-1.5 text-xs rounded-lg border outline-none"
            style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-secondary)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              <Check className="w-3 h-3" />
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium" style={{ color: display === "—" ? "var(--text-muted)" : "var(--text-primary)", fontStyle: display === "—" ? "italic" : "normal" }}>
          {display}
        </p>
      )}

      {sourceText && !editing && (
        <button
          onClick={() => setShowSrc(v => !v)}
          className="mt-2 flex items-center gap-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          {showSrc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          View source
        </button>
      )}
      {showSrc && sourceText && (
        <p className="mt-2 text-xs italic px-3 py-2 rounded-lg" style={{ background: "var(--bg)", color: "var(--text-secondary)", fontFamily: "'Geist Mono', monospace" }}>
          "{sourceText}"
        </p>
      )}
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"fields" | "raw" | "audit">("fields");
  const [exporting, setExporting] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const c = await getContract(id);
      setContract(c);
      if (c.status === "processing" || c.status === "pending") setPollingId(id);
      else setPollingId(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!pollingId) return;
    const iv = setInterval(load, 2500);
    return () => clearInterval(iv);
  }, [pollingId, load]);

  const handleSave = async (path: string, val: string, reason: string) => {
    await updateField(id, path, val, reason);
    await load();
  };

  const handleExport = async (fmt: "json" | "csv") => {
    setExporting(true);
    try { await exportContract(id, fmt); await load(); }
    finally { setExporting(false); }
  };

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center h-64 gap-2" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="w-4 h-4 spinner" /><span className="text-sm">Loading contract...</span>
      </div>
    </AppShell>
  );

  if (!contract) return (
    <AppShell>
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Contract not found.</p>
        <button onClick={() => router.push("/")} className="text-sm mt-2" style={{ color: "var(--accent)" }}>← Back</button>
      </div>
    </AppShell>
  );

  const cfg = contract.billing_config;
  const isProcessing = contract.status === "processing" || contract.status === "pending";
  const lowCount = cfg ? Object.values(cfg).filter((v: unknown) =>
    v && typeof v === "object" && "confidence" in (v as object) && ((v as { confidence: number }).confidence) < 0.7
  ).length : 0;

  return (
    <AppShell>
      <div className="animate-in">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm mb-2 transition-colors"
              style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> All contracts
            </button>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              {contract.filename}
            </h1>
            <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
              ID: {contract.id.slice(0, 8)} · Uploaded {new Date(contract.created_at).toLocaleDateString()}
            </p>
          </div>

          {contract.status === "completed" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-60"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--surface)" }}
              >
                <FileCsv className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-60"
                style={{ background: "var(--accent)" }}
              >
                <FileJson className="w-3.5 h-3.5" /> Export JSON
              </button>
            </div>
          )}
        </div>

        {/* Processing banner */}
        {isProcessing && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl border"
            style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
            <Loader2 className="w-4 h-4 spinner flex-shrink-0" style={{ color: "#1D4ED8" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#1E3A8A" }}>Parsing contract...</p>
              <p className="text-xs mt-0.5" style={{ color: "#3B82F6" }}>
                Extracting billing terms, payment schedules, usage tiers. This takes 5–15 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Failed banner */}
        {contract.status === "failed" && (
          <div className="mb-6 p-4 rounded-xl border" style={{ background: "var(--danger-light)", borderColor: "#FCA5A5" }}>
            <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>Processing failed</p>
            <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{contract.error_message}</p>
          </div>
        )}

        {/* Low confidence warning */}
        {lowCount > 0 && contract.status === "completed" && (
          <div className="mb-6 flex items-center gap-2 p-3 rounded-xl border"
            style={{ background: "var(--warning-light)", borderColor: "#FDE68A" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--warning)" }} />
            <p className="text-sm" style={{ color: "var(--warning)" }}>
              <strong>{lowCount} field{lowCount > 1 ? "s" : ""}</strong> have low confidence — please review before exporting.
            </p>
          </div>
        )}

        {contract.status === "completed" && cfg && (
          <>
            {/* Tabs */}
            <div className="flex border-b mb-6" style={{ borderColor: "var(--border)" }}>
              {(["fields", "raw", "audit"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px"
                  style={{
                    borderColor: tab === t ? "var(--accent)" : "transparent",
                    color: tab === t ? "var(--accent)" : "var(--text-secondary)",
                  }}>
                  {t === "fields" ? "Extracted Fields" : t === "raw" ? "Raw Text" : "Audit Log"}
                </button>
              ))}
            </div>

            {tab === "fields" && (
              <div className="max-w-3xl">
                {cfg.extraction_notes && (
                  <div className="mb-6 p-4 rounded-xl border text-sm" style={{ background: "#F0F9FF", borderColor: "#BAE6FD", color: "#0369A1" }}>
                    <strong>Note:</strong> {cfg.extraction_notes}
                  </div>
                )}

                <Section title="Parties">
                  {cfg.contract_parties?.vendor && (
                    <FieldCard label="Vendor" value={cfg.contract_parties.vendor.value}
                      confidence={cfg.contract_parties.vendor.confidence}
                      sourceText={cfg.contract_parties.vendor.source_text}
                      fieldPath="contract_parties.vendor" onSave={handleSave} />
                  )}
                  {cfg.contract_parties?.client && (
                    <FieldCard label="Client" value={cfg.contract_parties.client.value}
                      confidence={cfg.contract_parties.client.confidence}
                      sourceText={cfg.contract_parties.client.source_text}
                      fieldPath="contract_parties.client" onSave={handleSave} />
                  )}
                </Section>

                <Section title="Billing Terms">
                  {cfg.contract_value && (
                    <FieldCard label={`Contract Value (${cfg.contract_value.currency || "USD"})`}
                      value={cfg.contract_value.value}
                      confidence={cfg.contract_value.confidence}
                      sourceText={cfg.contract_value.source_text}
                      fieldPath="contract_value.value" onSave={handleSave} />
                  )}
                  {cfg.billing_frequency && (
                    <FieldCard label="Billing Frequency" value={cfg.billing_frequency.value}
                      confidence={cfg.billing_frequency.confidence}
                      sourceText={cfg.billing_frequency.source_text}
                      fieldPath="billing_frequency.value" onSave={handleSave} />
                  )}
                  {cfg.payment_schedule && (
                    <FieldCard label="Payment Terms" value={cfg.payment_schedule.value}
                      confidence={cfg.payment_schedule.confidence}
                      sourceText={cfg.payment_schedule.source_text}
                      fieldPath="payment_schedule.value" onSave={handleSave} />
                  )}
                  {cfg.payment_schedule?.due_days != null && (
                    <FieldCard label="Days Until Due" value={cfg.payment_schedule.due_days}
                      confidence={cfg.payment_schedule.confidence}
                      fieldPath="payment_schedule.due_days" onSave={handleSave} />
                  )}
                </Section>

                <Section title="Contract Period">
                  {cfg.start_date && (
                    <FieldCard label="Start Date" value={cfg.start_date.value}
                      confidence={cfg.start_date.confidence}
                      sourceText={cfg.start_date.source_text}
                      fieldPath="start_date.value" onSave={handleSave} />
                  )}
                  {cfg.end_date && (
                    <FieldCard label="End Date" value={cfg.end_date.value}
                      confidence={cfg.end_date.confidence}
                      sourceText={cfg.end_date.source_text}
                      fieldPath="end_date.value" onSave={handleSave} />
                  )}
                </Section>

                {cfg.renewal_clause && (
                  <Section title="Renewal">
                    <FieldCard label="Auto-Renews" value={cfg.renewal_clause.auto_renews}
                      confidence={cfg.renewal_clause.confidence}
                      sourceText={cfg.renewal_clause.source_text}
                      fieldPath="renewal_clause.auto_renews" onSave={handleSave} />
                    <FieldCard label="Renewal Period (months)" value={cfg.renewal_clause.renewal_period_months}
                      confidence={cfg.renewal_clause.confidence}
                      fieldPath="renewal_clause.renewal_period_months" onSave={handleSave} />
                    <FieldCard label="Cancellation Notice (days)" value={cfg.renewal_clause.cancellation_notice_days}
                      confidence={cfg.renewal_clause.confidence}
                      fieldPath="renewal_clause.cancellation_notice_days" onSave={handleSave} />
                  </Section>
                )}

                {cfg.late_fee && (
                  <Section title="Late Fees">
                    <FieldCard label="Applies" value={cfg.late_fee.applies}
                      confidence={cfg.late_fee.confidence}
                      sourceText={cfg.late_fee.source_text}
                      fieldPath="late_fee.applies" onSave={handleSave} />
                    <FieldCard label="Rate (%/month)" value={cfg.late_fee.rate_percent}
                      confidence={cfg.late_fee.confidence}
                      fieldPath="late_fee.rate_percent" onSave={handleSave} />
                    <FieldCard label="Grace Period (days)" value={cfg.late_fee.grace_period_days}
                      confidence={cfg.late_fee.confidence}
                      fieldPath="late_fee.grace_period_days" onSave={handleSave} />
                  </Section>
                )}

                {cfg.usage_tiers?.value && cfg.usage_tiers.value.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Usage Tiers</p>
                      <ConfidenceBadge score={cfg.usage_tiers.confidence} />
                    </div>
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <table className="w-full text-sm">
                        <thead style={{ background: "var(--bg)", borderBottom: `1px solid var(--border)` }}>
                          <tr>
                            {["Tier", "Min", "Max", "Price/Unit", "Flat Fee", "Unit"].map(h => (
                              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody style={{ background: "var(--surface)" }}>
                          {cfg.usage_tiers.value.map((tier, i) => (
                            <tr key={i} style={{ borderTop: i > 0 ? `1px solid var(--border)` : "none" }}>
                              <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{tier.tier_name}</td>
                              <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{tier.min_units ?? "—"}</td>
                              <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{tier.max_units ?? "∞"}</td>
                              <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{tier.price_per_unit != null ? `$${tier.price_per_unit}` : "—"}</td>
                              <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{tier.flat_fee != null ? `$${tier.flat_fee}` : "—"}</td>
                              <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>{tier.unit_type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {cfg.special_terms?.value && cfg.special_terms.value.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Special Terms</p>
                    <div className="rounded-xl border p-4 space-y-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      {cfg.special_terms.value.map((term, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: "var(--accent)" }} />
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{term}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "raw" && (
              <pre className="text-xs rounded-xl p-5 border overflow-auto max-h-[70vh] leading-relaxed"
                style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-secondary)", fontFamily: "'Geist Mono', monospace" }}>
                {contract.raw_text || "No raw text available"}
              </pre>
            )}

            {tab === "audit" && (
              <div className="max-w-2xl space-y-2">
                {contract.audit_log.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No audit entries yet.</p>
                ) : (
                  contract.audit_log.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3.5 rounded-xl border"
                      style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs"
                        style={{
                          background: entry.action === "extracted" ? "var(--accent-light)" : entry.action === "edited" ? "var(--warning-light)" : "var(--bg)",
                          color: entry.action === "extracted" ? "var(--accent)" : entry.action === "edited" ? "var(--warning)" : "var(--text-muted)",
                        }}>
                        {entry.action === "extracted" ? "→" : entry.action === "edited" ? "✎" : "↓"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium capitalize" style={{ color: "var(--text-primary)" }}>{entry.action}</span>
                          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{entry.field_name}</span>
                        </div>
                        {entry.reason && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{entry.reason}</p>}
                        {entry.action === "edited" && (
                          <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
                            {JSON.stringify(entry.old_value)} → {JSON.stringify(entry.new_value)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)", fontFamily: "'Geist Mono', monospace" }}>
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}