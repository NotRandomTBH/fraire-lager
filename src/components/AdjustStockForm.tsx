"use client";

import { adjustStockAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function AdjustStockForm({
  sizes,
}: {
  sizes: { id: string; label: string; looseStock: number }[];
}) {
  return (
    <ActionForm action={adjustStockAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Grösse</label>
        <select
          name="sizeId"
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        >
          {sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} (aktuell {s.looseStock})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Tatsächlicher Bestand</label>
        <input
          type="number"
          name="newQuantity"
          min={0}
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Grund</label>
        <input
          type="text"
          name="note"
          required
          placeholder="z.B. Inventur"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>
      <SubmitButton>Korrektur buchen</SubmitButton>
    </ActionForm>
  );
}
