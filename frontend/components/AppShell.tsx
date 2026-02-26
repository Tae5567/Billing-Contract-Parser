"use client";

import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main
        className="min-h-screen"
        style={{ marginLeft: "var(--sidebar-width)", padding: "32px 36px" }}
      >
        {children}
      </main>
    </div>
  );
}