"use client";

import { useState } from "react";
import { generateDefectPdfAction } from "@/app/actions";
import { DefectReportCard, type DefectReportData } from "@/components/DefectReportCard";

function downloadBase64Pdf(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DefectReportsList({ reports }: { reports: DefectReportData[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === reports.length ? new Set() : new Set(reports.map((r) => r.id)),
    );
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateDefectPdfAction(Array.from(selected));
      downloadBase64Pdf(result.base64, result.filename);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  if (reports.length === 0) {
    return <p className="text-sm text-neutral-400">Noch keine Defekte erfasst.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.size === reports.length}
            onChange={toggleAll}
          />
          {selected.size > 0 ? `${selected.size} ausgewählt` : "Alle auswählen"}
        </label>
        <button
          type="button"
          onClick={handleExport}
          disabled={selected.size === 0 || generating}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {generating ? "PDF wird erstellt…" : "PDF erstellen"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        {reports.map((r) => (
          <div key={r.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => toggle(r.id)}
              className="mt-6"
            />
            <div className="flex-1">
              <DefectReportCard report={r} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
