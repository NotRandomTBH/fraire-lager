"use client";

import { useState } from "react";
import { receiveStockAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

const MAX_PHOTO_WIDTH = 1280;
const JPEG_QUALITY = 0.7;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_PHOTO_WIDTH / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas nicht verfügbar."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Foto konnte nicht gelesen werden."));
    };
    img.src = objectUrl;
  });
}

export function WareneingangForm({
  sizes,
}: {
  sizes: { id: string; label: string }[];
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

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

  return (
    <ActionForm
      action={receiveStockAction}
      resetOnSuccess
      className="space-y-4"
      onSuccess={() => setPhotos([])}
    >
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

      <div>
        <label className="mb-1 block text-sm font-medium">Anzahl gut (lose Teile)</label>
        <input
          type="number"
          name="quantity"
          min={0}
          defaultValue={0}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz (optional)</label>
        <input
          type="text"
          name="note"
          placeholder="z.B. Lieferung Rechnung #123"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Anzahl defekt</label>
          <input
            type="number"
            name="defectQuantity"
            min={0}
            defaultValue={0}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notiz zum Defekt (optional)</label>
          <input
            type="text"
            name="defectNote"
            placeholder="z.B. Naht geplatzt"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Fotos vom Defekt</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="w-full text-sm"
          />
          {compressing && (
            <p className="mt-1 text-xs text-neutral-500">Fotos werden verarbeitet…</p>
          )}
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative">
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
      </div>

      <input type="hidden" name="defectPhotos" value={JSON.stringify(photos)} />

      <SubmitButton>Wareneingang buchen</SubmitButton>
    </ActionForm>
  );
}
