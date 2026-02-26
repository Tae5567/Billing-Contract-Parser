"use client";

import { AuditEntry } from "@/lib/api";
import { Clock, Edit3, Download, Zap } from "lucide-react";
import clsx from "clsx";

interface AuditLogProps {
  entries: AuditEntry[];
}

const actionIcon = {
  extracted: Zap,
  edited: Edit3,
  exported: Download,
};

const actionColor = {
  extracted: "text-blue-600 bg-blue-50",
  edited: "text-amber-600 bg-amber-50",
  exported: "text-purple-600 bg-purple-50",
};

export default function AuditLog({ entries }: AuditLogProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No audit entries yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const Icon = actionIcon[entry.action as keyof typeof actionIcon] || Clock;
        const colorClass = actionColor[entry.action as keyof typeof actionColor] || "text-slate-600 bg-slate-50";

        return (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white"
          >
            <span className={clsx("mt-0.5 p-1.5 rounded-lg", colorClass)}>
              <Icon className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700 capitalize">{entry.action}</span>
                <span className="text-xs text-slate-400 font-mono">{entry.field_name}</span>
              </div>
              {entry.reason && (
                <p className="text-xs text-slate-500 mt-0.5">{entry.reason}</p>
              )}
              {entry.old_value !== null && entry.action === "edited" && (
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {JSON.stringify(entry.old_value)} → {JSON.stringify(entry.new_value)}
                </p>
              )}
            </div>
            <span className="text-xs text-slate-300 font-mono flex-shrink-0 mt-0.5">
              {new Date(entry.created_at).toLocaleTimeString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}