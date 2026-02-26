interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subPositive?: boolean;
}

export default function StatCard({ label, value, sub, subPositive }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      {sub && (
        <p
          className="text-xs mt-1.5"
          style={{ color: subPositive ? "var(--accent)" : "var(--text-muted)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}