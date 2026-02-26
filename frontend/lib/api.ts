/**
 * Typed API client for the Contract Parser backend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ExtractedField<T = string | number | boolean | null> {
  value: T;
  confidence: number;
  source_text?: string;
  manually_reviewed?: boolean;
}

export interface UsageTier {
  tier_name: string;
  min_units: number | null;
  max_units: number | null;
  price_per_unit: number | null;
  flat_fee: number | null;
  unit_type: string;
}

export interface BillingConfig {
  contract_parties?: {
    vendor: ExtractedField;
    client: ExtractedField;
  };
  contract_value?: ExtractedField<number | null> & { currency: string };
  billing_frequency?: ExtractedField & { custom_description?: string };
  payment_schedule?: ExtractedField & { due_days?: number };
  usage_tiers?: { value: UsageTier[]; confidence: number; source_text?: string };
  renewal_clause?: {
    auto_renews: boolean | null;
    renewal_period_months: number | null;
    cancellation_notice_days: number | null;
    confidence: number;
    source_text?: string;
  };
  late_fee?: {
    applies: boolean | null;
    rate_percent: number | null;
    grace_period_days: number | null;
    flat_amount: number | null;
    confidence: number;
    source_text?: string;
  };
  start_date?: ExtractedField;
  end_date?: ExtractedField;
  special_terms?: ExtractedField<string[]>;
  extraction_notes?: string;
}

export interface AuditEntry {
  id: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  action: string;
  created_at: string;
}

export interface Contract {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  raw_text?: string;
  billing_config?: BillingConfig;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  audit_log: AuditEntry[];
}

export interface ContractSummary {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── API functions ─────────────────────────────────────────────────────────

export async function uploadContract(file: File): Promise<{ contract_id: string; status: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/contracts/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function getContract(id: string): Promise<Contract> {
  const res = await fetch(`${API_URL}/api/contracts/${id}`);
  if (!res.ok) throw new Error("Contract not found");
  return res.json();
}

export async function listContracts(skip = 0, limit = 20): Promise<{
  contracts: ContractSummary[];
  total: number;
}> {
  const res = await fetch(`${API_URL}/api/contracts?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to list contracts");
  return res.json();
}

export async function updateField(
  contractId: string,
  field: string,
  value: unknown,
  reason?: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/contracts/${contractId}/fields`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Update failed");
  }
}

export async function exportContract(contractId: string, format: "json" | "csv"): Promise<void> {
  const res = await fetch(`${API_URL}/api/contracts/${contractId}/export?format=${format}`);
  if (!res.ok) throw new Error("Export failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contract_${contractId.slice(0, 8)}_billing.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteContract(contractId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/contracts/${contractId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Delete failed");
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function getConfidenceLabel(score: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (score >= 0.9) return { label: "High", color: "text-emerald-700", bg: "bg-emerald-50" };
  if (score >= 0.7) return { label: "Medium", color: "text-amber-700", bg: "bg-amber-50" };
  return { label: "Low — Review", color: "text-red-700", bg: "bg-red-50" };
}