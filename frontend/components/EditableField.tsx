"use client";

import { useState } from "react";
import { Pencil, Check, X, CheckCircle2 } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";
import clsx from "clsx";

interface EditableFieldProps {
  fieldKey: string;
  label: string;
  value: unknown;
  confidence?: number;
  sourceText?: string;
  manuallyReviewed?: boolean;
  onSave: (value: string, reason: string) => Promise<void>;
}

export default function EditableField({
  fieldKey,
  label,
  value,
  confidence,
  sourceText,
  manuallyReviewed,
  onSave,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const displayValue =
    value === null || value === undefined
      ? "—"
      : typeof value === "boolean"
      ? value ? "Yes" : "No"
      : String(value);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editValue, reason);
      setEditing(false);
      setReason("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={clsx(
      "group border rounded-xl p-4 transition-all",
      manuallyReviewed
        ? "border-emerald-200 bg-emerald-50/40"
        : confidence !== undefined && confidence < 0.7
        ? "border-red-200 bg-red-50/30"
        : "border-slate-200 bg-white hover:border-slate-300"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wide">{label}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {manuallyReviewed && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
            </span>
          )}
          {!editing && (
            <button
              onClick={() => {
                setEditValue(displayValue === "—" ? "" : displayValue);
                setEditing(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
              title="Edit this field"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Value */}
      {editing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-mono"
            autoFocus
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for change (optional)"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 bg-slate-50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={clsx(
          "text-sm font-medium break-words",
          displayValue === "—" ? "text-slate-300 italic" : "text-slate-900"
        )}>
          {displayValue}
        </p>
      )}

      {/* Confidence */}
      {confidence !== undefined && !editing && (
        <div className="mt-3 flex items-center justify-between">
          <ConfidenceBadge score={confidence} />
          {sourceText && (
            <button
              onClick={() => setShowSource(!showSource)}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              {showSource ? "Hide" : "Source"}
            </button>
          )}
        </div>
      )}

      {/* Source text */}
      {showSource && sourceText && (
        <p className="mt-2 text-xs text-slate-500 italic bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 font-mono leading-relaxed">
          "{sourceText}"
        </p>
      )}
    </div>
  );
}