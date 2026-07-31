"use client";

import { useState } from "react";
import {
  addDefectNoteAction,
  addDefectPhotosAction,
  editDefectReportAction,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { compressImage } from "@/lib/image";
import { defectItemLabel } from "@/lib/labels";

const FIELD_LABEL: Record<string, string> = { quantity: "Menge", note: "Notiz" };

export type DefectReportData = {
  id: string;
  itemType: string;
  quantity: number;
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
  size: { label: string } | null;
  packSize: number | null;
  photos: { id: string; dataUrl: string }[];
  reasons: { id: string; label: string }[];
  notes: { id: string; text: string; createdBy: string | null; createdAt: Date }[];
  edits: {
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
    createdBy: string | null;
    createdAt: Date;
  }[];
};

export function DefectReportCard({ report }: { report: DefectReportData }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(Array.from(files).map(compressImage));
      setNewPhotos((prev) => [...prev, ...compressed]);
    } catch {
      // einzelnes fehlerhaftes Foto einfach ignorieren
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-medium">{defectItemLabel(report)}</span>
          <span className="text-neutral-500"> · {report.quantity} Stück defekt</span>
        </div>
        <div className="text-neutral-500">
          {report.createdAt.toLocaleString("de-CH")}
          {report.createdBy && <> · {report.createdBy}</>}
        </div>
      </div>

      {report.reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {report.reasons.map((reason) => (
            <span
              key={reason.id}
              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
            >
              {reason.label}
            </span>
          ))}
        </div>
      )}

      {report.note && <p className="mt-1 text-sm text-neutral-600">{report.note}</p>}

      {report.photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.dataUrl}
              alt="Defekt-Foto"
              className="h-28 w-28 rounded object-cover"
            />
          ))}
        </div>
      )}

      {report.notes.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2">
          {report.notes.map((n) => (
            <p key={n.id} className="text-sm text-neutral-600">
              <span className="text-neutral-400">
                {n.createdAt.toLocaleString("de-CH")}
                {n.createdBy && ` · ${n.createdBy}`}:
              </span>{" "}
              {n.text}
            </p>
          ))}
        </div>
      )}

      {report.edits.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-neutral-100 pt-2">
          {report.edits.map((e) => (
            <p key={e.id} className="text-xs text-neutral-400">
              {e.createdAt.toLocaleString("de-CH")}
              {e.createdBy && ` · ${e.createdBy}`}: {FIELD_LABEL[e.field] ?? e.field} „
              {e.oldValue}“ → „{e.newValue}“ (Begründung: {e.reason})
            </p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-sm text-neutral-500 underline"
      >
        {expanded ? "Weniger" : "Bearbeiten / Foto & Notiz hinzufügen"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4 border-t border-neutral-100 pt-3">
          <ActionForm
            action={addDefectPhotosAction}
            resetOnSuccess
            className="space-y-2"
            onSuccess={() => setNewPhotos([])}
          >
            <input type="hidden" name="reportId" value={report.id} />
            <label className="block text-sm font-medium">Foto hinzufügen</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="w-full text-sm"
            />
            {compressing && (
              <p className="text-xs text-neutral-500">Fotos werden verarbeitet…</p>
            )}
            {newPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newPhotos.map((photo, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Neues Foto ${i + 1}`}
                      className="h-16 w-16 rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input type="hidden" name="photos" value={JSON.stringify(newPhotos)} />
            <SubmitButton className="!px-3 !py-1.5 !text-xs">Foto(s) speichern</SubmitButton>
          </ActionForm>

          <ActionForm action={addDefectNoteAction} resetOnSuccess className="space-y-2">
            <input type="hidden" name="reportId" value={report.id} />
            <label className="block text-sm font-medium">Bemerkung hinzufügen</label>
            <textarea
              name="text"
              required
              rows={2}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <SubmitButton className="!px-3 !py-1.5 !text-xs">Bemerkung speichern</SubmitButton>
          </ActionForm>

          <div>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm text-amber-700 underline"
              >
                Menge / Notiz bearbeiten (Begründung nötig)
              </button>
            ) : (
              <ActionForm
                action={editDefectReportAction}
                resetOnSuccess
                className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3"
                onSuccess={() => setEditing(false)}
              >
                <input type="hidden" name="reportId" value={report.id} />
                <div>
                  <label className="block text-xs font-medium">Menge</label>
                  <input
                    type="number"
                    name="newQuantity"
                    min={1}
                    defaultValue={report.quantity}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Notiz</label>
                  <input
                    type="text"
                    name="newNote"
                    defaultValue={report.note ?? ""}
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Begründung (Pflicht)</label>
                  <input
                    type="text"
                    name="reason"
                    required
                    placeholder="Warum wird das geändert?"
                    className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <SubmitButton className="!px-3 !py-1.5 !text-xs">
                    Änderung speichern
                  </SubmitButton>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-xs text-neutral-500"
                  >
                    Abbrechen
                  </button>
                </div>
              </ActionForm>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
