//app/upload/page.tsx

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, FileRejection } from "react-dropzone";
import AppShell from "@/components/AppShell";
import { uploadContract } from "@/lib/api";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(null);
    if (rejected.length > 0) {
      setError(rejected[0].errors[0].message);
      return;
    }
    if (!accepted[0]) return;

    setUploading(true);
    uploadContract(accepted[0])
      .then((result) => {
        router.push(`/contracts/${result.contract_id}`);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Upload failed");
        setUploading(false);
      });
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  return (
    <AppShell>
      <div className="animate-in max-w-xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Upload Contract</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            PDF or plain text — the parser will extract all billing terms automatically
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={clsx(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
            isDragActive ? "border-[#1A6B4A] bg-[#EBF5F0]" : "border-[#E5E4E0] hover:border-[#A8A49E]",
            uploading && "opacity-50 pointer-events-none"
          )}
        >
          <input {...getInputProps()} />

          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: isDragActive ? "var(--accent-light)" : "var(--bg)" }}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full spinner" style={{ borderColor: "var(--accent)" }} />
            ) : (
              <Upload className="w-5 h-5" style={{ color: isDragActive ? "var(--accent)" : "var(--text-muted)" }} />
            )}
          </div>

          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            {uploading ? "Uploading..." : isDragActive ? "Drop it here" : "Drop your contract here"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            or click to browse · PDF and TXT · max 10MB
          </p>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm p-3 rounded-lg" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* What happens next */}
        <div className="mt-6 rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>
            What happens next
          </p>
          <div className="space-y-3">
            {[
              "Text is extracted from your PDF or file",
              "LLM identifies all billing terms with confidence scores",
              "You review, edit, and confirm extracted fields",
              "Export as JSON or CSV for import into your billing system",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  {i + 1}
                </div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* File types */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "PDF Files", sub: "Scanned or digital contracts" },
            { label: "Text Files", sub: "Plain text .txt contracts" },
          ].map(({ label, sub }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="p-2 rounded-lg" style={{ background: "var(--bg)" }}>
                <FileText className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}