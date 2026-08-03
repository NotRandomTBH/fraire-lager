"use client";

import {
  adjustMaxLagerPackagingStockAction,
  adjustMaxLagerStockAction,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function MaxLagerAdjustForm({
  sizes,
  packagingStock,
}: {
  sizes: { id: string; label: string; looseStock: number }[];
  packagingStock: { packSize: number; quantity: number }[];
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ActionForm action={adjustMaxLagerStockAction} resetOnSuccess className="space-y-4">
        <p className="text-sm font-medium">Lose Unterhosen korrigieren</p>
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

      <ActionForm action={adjustMaxLagerPackagingStockAction} resetOnSuccess className="space-y-4">
        <p className="text-sm font-medium">Verpackungsmaterial korrigieren</p>
        <div>
          <label className="mb-1 block text-sm font-medium">Packgrösse</label>
          <select
            name="packSize"
            required
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          >
            {packagingStock.map((p) => (
              <option key={p.packSize} value={p.packSize}>
                {p.packSize}er (aktuell {p.quantity})
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
    </div>
  );
}
