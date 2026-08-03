"use client";

import { Fragment, useState } from "react";
import { addStockExitNoteAction, generateStockExitsPdfAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import type { UnifiedMovement } from "@/lib/inventory";

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

const CATEGORY_ORDER = ["Warenausgang", "Unterhosen", "Verpackung", "Karton", "Maxims Lager"];

const CATEGORY_BADGE: Record<string, string> = {
  Unterhosen: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
  Verpackung: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
  Karton: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400",
  "Maxims Lager": "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  Warenausgang: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400",
};

function formatMovementDate(m: UnifiedMovement) {
  return m.dateOnly ? m.date.toLocaleDateString("de-CH") : m.date.toLocaleString("de-CH");
}

export function BewegungenList({ movements }: { movements: UnifiedMovement[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const availableCategories = CATEGORY_ORDER.filter((c) =>
    movements.some((m) => m.category === c),
  );
  const filteredMovements = categoryFilter
    ? movements.filter((m) => m.category === categoryFilter)
    : movements;

  const exitIds = filteredMovements.filter((m) => m.exitId).map((m) => m.exitId as string);

  function toggle(exitId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(exitId)) next.delete(exitId);
      else next.add(exitId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === exitIds.length ? new Set() : new Set(exitIds)));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  if (movements.length === 0) {
    return <p className="text-sm text-neutral-400 dark:text-neutral-500">Noch keine Bewegungen.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            categoryFilter === null
              ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
          }`}
        >
          Alle
        </button>
        {availableCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              categoryFilter === c
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : (CATEGORY_BADGE[c] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400")
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {exitIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.size === exitIds.length}
              onChange={toggleAll}
            />
            {selected.size > 0 ? `${selected.size} Austräge ausgewählt` : "Alle Austräge auswählen"}
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={selected.size === 0 || generating}
            className="rounded-md bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 disabled:opacity-50"
          >
            {generating ? "PDF wird erstellt…" : "Austräge als PDF"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800 text-left text-neutral-600 dark:text-neutral-400">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Kategorie</th>
              <th className="px-3 py-2">Typ</th>
              <th className="px-3 py-2">Menge</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Von</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.map((m) => {
              const isExpanded = expanded.has(m.id);
              return (
                <Fragment key={m.id}>
                  <tr className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2">
                      {m.exitId && (
                        <input
                          type="checkbox"
                          checked={selected.has(m.exitId)}
                          onChange={() => toggle(m.exitId as string)}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                      {formatMovementDate(m)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_BADGE[m.category] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"}`}
                      >
                        {m.category}
                      </span>
                    </td>
                    <td className="px-3 py-2">{m.typeLabel}</td>
                    <td
                      className={`px-3 py-2 ${m.quantityDelta < 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}
                    >
                      {m.quantityDelta > 0 ? "+" : ""}
                      {m.quantityDelta}
                    </td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{m.details}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{m.createdBy ?? "–"}</td>
                    <td className="px-3 py-2 text-right">
                      {m.exitId && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(m.id)}
                          className="text-xs text-neutral-400 dark:text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
                        >
                          {isExpanded ? "schliessen" : `Notiz${m.notes && m.notes.length > 0 ? ` (${m.notes.length})` : ""}`}
                        </button>
                      )}
                    </td>
                  </tr>
                  {m.exitId && isExpanded && (
                    <tr className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                      <td></td>
                      <td colSpan={7} className="px-3 py-3">
                        {m.notes && m.notes.length > 0 && (
                          <ul className="mb-3 space-y-1">
                            {m.notes.map((n) => (
                              <li key={n.id} className="text-sm text-neutral-600 dark:text-neutral-400">
                                <span className="text-neutral-400 dark:text-neutral-500">
                                  {n.createdAt.toLocaleString("de-CH")}
                                  {n.createdBy && ` · ${n.createdBy}`}:
                                </span>{" "}
                                {n.text}
                              </li>
                            ))}
                          </ul>
                        )}
                        <ActionForm action={addStockExitNoteAction} resetOnSuccess className="flex gap-2">
                          <input type="hidden" name="stockExitId" value={m.exitId} />
                          <input
                            type="text"
                            name="text"
                            required
                            placeholder="Notiz hinzufügen…"
                            className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"
                          />
                          <SubmitButton className="!px-3 !py-1.5 !text-xs">Speichern</SubmitButton>
                        </ActionForm>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
