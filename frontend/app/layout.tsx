import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contract Parser — Billing Extractor",
  description: "Parse B2B contracts and extract structured billing configuration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}