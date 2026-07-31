"use client";

import { useState } from "react";
import { createDefectReasonAction, recordDefectAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { compressImage } from "@/lib/image";

type DefectReason = { id: string; label: string };
type ItemType = "UNTERHOSE" | "VERPACKUNG" | "KARTON";

export function DefectCaptureForm({
  sizes,
  packagingStock,
  defectReasons,
}: {
  sizes: { id: string; label: string }[];
  packagingStock: { packSize: number; quantity: number }[];
  defectReasons: DefectReason[];
}) {
  const [itemType, setItemType] = useState<ItemType>("UNTERHOSE");
  const [packSize, setPackSize] = useState(packagingStock[0]?.packSize ?? 1);
  const [photos, setPhotos] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [reasons, setReasons] = useState<DefectReason[]>(defectReasons);
  const [selectedReasonIds, setSelectedReasonIds] = useState<string[]>([]);
  const [newReasonLabel, setNewReasonLabel] = useState("");
  const [addingReason, setAddingReason] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(Array.from(files).map(compressImage));
      setPhotos((prev) => [...prev, ...compressed]);
    } catch {
      // einzelnes fehlerhaftes Foto einfach ignorieren
    } finally {
      setCompressing(false);
    }
  }

  function toggleReason(id: string) {
    setSelectedReasonIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  async function handleAddReason() {
    const label = newReasonLabel.trim();
    if (!label) return;
    setAddingReason(true);
    try {
      const reason = await createDefectReasonAction(label);
      setReasons((prev) =>
        prev.some((r) => r.id === reason.id) ? prev : [...prev, reason].sort((a, b) => a.label.localeCompare(b.label)),
      );
      setSelectedReasonIds((prev) => (prev.includes(reason.id) ? prev : [...prev, reason.id]));
      setNewReasonLabel("");
    } catch {
      // still lassen, Nutzer kann es erneut versuchen
    } finally {
      setAddingReason(false);
    }
  }

  return (
    <ActionForm
      action={recordDefectAction}
      resetOnSuccess
      className="space-y-4"
      onSuccess={() => {
        setPhotos([]);
        setSelectedReasonIds([]);
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Was ist defekt?</label>
        <select
          name="itemType"
          required
          value={itemType}
          onChange={(e) => setItemType(e.target.value as ItemType)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="UNTERHOSE">Unterhosen</option>
          <option value="VERPACKUNG">Verpackungsmaterial</option>
          <option value="KARTON">Versandkarton</option>
        </select>
      </div>

      {itemType === "UNTERHOSE" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Grösse</label>
          <select
            name="sizeId"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          >
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {itemType === "VERPACKUNG" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Packgrösse</label>
          <select
            name="packSize"
            value={packSize}
            onChange={(e) => setPackSize(Number(e.target.value))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          >
            {packagingStock.map((p) => (
              <option key={p.packSize} value={p.packSize}>
                {p.packSize}er
              </option>
            ))}
          </select>
        </div>
      )}
      {itemType !== "VERPACKUNG" && <input type="hidden" name="packSize" value="" />}
      {itemType !== "UNTERHOSE" && <input type="hidden" name="sizeId" value="" />}

      <div>
        <label className="mb-1 block text-sm font-medium">Anzahl defekt</label>
        <input
          type="number"
          name="quantity"
          min={1}
          required
          defaultValue={1}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Defekt-Art (mehrere möglich)</label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {reasons.map((r) => (
            <label key={r.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={selectedReasonIds.includes(r.id)}
                onChange={() => toggleReason(r.id)}
              />
              {r.label}
            </label>
          ))}
          {reasons.length === 0 && (
            <p className="text-sm text-neutral-400">Noch keine Defekt-Arten angelegt.</p>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={newReasonLabel}
            onChange={(e) => setNewReasonLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddReason();
              }
            }}
            placeholder="Neue Defekt-Art…"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAddReason}
            disabled={addingReason || !newReasonLabel.trim()}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          >
            + Hinzufügen
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz (optional)</label>
        <input
          type="text"
          name="defectNote"
          placeholder="zusätzliche Details"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Fotos</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="w-full text-sm"
        />
        {compressing && <p className="mt-1 text-xs text-neutral-500">Fotos werden verarbeitet…</p>}
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={`Foto ${i + 1}`}
                  className="h-20 w-20 rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <input type="hidden" name="defectPhotos" value={JSON.stringify(photos)} />
      <input type="hidden" name="defectReasonIds" value={JSON.stringify(selectedReasonIds)} />

      <SubmitButton>Defekt erfassen</SubmitButton>
    </ActionForm>
  );
}
