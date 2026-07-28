"use client";

import { useState } from "react";
import { generateStockExitsPdfAction } from "@/app/actions";

export type StockExitData = {
  id: string;
  quantity: number;
  packSize: number | null;
  reason: string;
  recipient: string | null;
  date: Date;
  createdBy: string | null;
  pushedToShopify: boolean;
  size: { label: string };
};

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

export function StockExitsList({ exits }: { exits: StockExitData[] }) {
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
    setSelected((prev) => (prev.size === exits.length ? new Set() : new Set(exits.map((e) => e.id))));
  }

  async function handleExport() {
    if (selected.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateStockExitsPdfAction(Array.from(selected));
      downloadBase64Pdf(result.base64, result.filename);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  if (exits.length === 0) {
    return <p className="text-sm text-neutral-400">Noch keine Austräge erfasst.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.size === exits.length} onChange={toggleAll} />
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

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left text-neutral-600">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Grösse</th>
              <th className="px-3 py-2">Menge</th>
              <th className="px-3 py-2">Begründung</th>
              <th className="px-3 py-2">Empfänger</th>
              <th className="px-3 py-2">Erfasst von</th>
            </tr>
          </thead>
          <tbody>
            {exits.map((e) => (
              <tr key={e.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-neutral-500">
                  {e.date.toLocaleDateString("de-CH")}
                </td>
                <td className="px-3 py-2 font-medium">{e.size.label}</td>
                <td className="px-3 py-2">
                  {e.packSize ? `${e.quantity} × ${e.packSize}er` : `${e.quantity} lose`}
                  {e.pushedToShopify && (
                    <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                      Shopify
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-neutral-600">{e.reason}</td>
                <td className="px-3 py-2 text-neutral-600">{e.recipient ?? "–"}</td>
                <td className="px-3 py-2 text-neutral-500">{e.createdBy ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
