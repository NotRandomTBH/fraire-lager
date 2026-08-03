"use client";

import {
  transferLooseToMaxLagerAction,
  transferPackagingToMaxLagerAction,
} from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function MaxLagerTransferForm({
  sizes,
  packagingStock,
}: {
  sizes: { id: string; label: string; looseStock: number }[];
  packagingStock: { packSize: number; quantity: number }[];
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ActionForm action={transferLooseToMaxLagerAction} resetOnSuccess className="space-y-4">
        <p className="text-sm font-medium">Lose Unterhosen übernehmen</p>
        <div>
          <label className="mb-1 block text-sm font-medium">Grösse</label>
          <select
            name="sizeId"
            required
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          >
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.looseStock} im Hauptlager)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Anzahl</label>
          <input
            type="number"
            name="quantity"
            min={1}
            required
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          />
        </div>
        <SubmitButton>Übernehmen</SubmitButton>
      </ActionForm>

      <ActionForm action={transferPackagingToMaxLagerAction} resetOnSuccess className="space-y-4">
        <p className="text-sm font-medium">Verpackungsmaterial übernehmen</p>
        <div>
          <label className="mb-1 block text-sm font-medium">Packgrösse</label>
          <select
            name="packSize"
            required
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          >
            {packagingStock.map((p) => (
              <option key={p.packSize} value={p.packSize}>
                {p.packSize}er ({p.quantity} im Hauptlager)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Anzahl</label>
          <input
            type="number"
            name="quantity"
            min={1}
            required
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          />
        </div>
        <SubmitButton>Übernehmen</SubmitButton>
      </ActionForm>
    </div>
  );
}
