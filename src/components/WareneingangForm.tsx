"use client";

import { receiveStockAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function WareneingangForm({
  sizes,
}: {
  sizes: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={receiveStockAction} resetOnSuccess className="space-y-4">
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
        <label className="mb-1 block text-sm font-medium">Anzahl lose Teile</label>
        <input
          type="number"
          name="quantity"
          min={1}
          required
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

      <SubmitButton>Wareneingang buchen</SubmitButton>
    </ActionForm>
  );
}
