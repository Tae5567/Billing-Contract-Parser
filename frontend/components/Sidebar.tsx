"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Upload, History, FileText } from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Contract", icon: Upload },
  { href: "/audit", label: "Audit Log", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col border-r bg-white z-20"
      style={{ width: "var(--sidebar-width)", borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              ContractParser
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "'Geist Mono', monospace" }}>
              Billing Extractor
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
              isActive(href)
                ? "font-medium"
                : "hover:bg-gray-50"
            )}
            style={
              isActive(href)
                ? {
                    backgroundColor: "var(--accent-light)",
                    color: "var(--accent)",
                  }
                : { color: "var(--text-secondary)" }
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>v1.0.0</p>
      </div>
    </aside>
  );
}