import clsx from "clsx";
import { getConfidenceLabel } from "@/lib/api";

interface ConfidenceBadgeProps {
  score: number;
  showBar?: boolean;
}

export default function ConfidenceBadge({ score, showBar = true }: ConfidenceBadgeProps) {
  const { label, color, bg } = getConfidenceLabel(score);
  const percent = Math.round(score * 100);

  return (
    <div className="flex items-center gap-2">
      <span className={clsx("text-xs font-mono px-2 py-0.5 rounded-full font-medium", color, bg)}>
        {percent}% — {label}
      </span>
      {showBar && (
        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full confidence-bar",
              score >= 0.9 ? "bg-emerald-500" : score >= 0.7 ? "bg-amber-500" : "bg-red-400"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}