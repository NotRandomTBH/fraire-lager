"use client";

import { adjustPackagingStockAction, receivePackagingStockAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function PackagingStockForm({
  stock,
}: {
  stock: { packSize: number; quantity: number }[];
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 dark:bg-neutral-800 text-left text-neutral-600 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2">Packgrösse</th>
              <th className="px-4 py-2">Bestand</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.packSize} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-2 font-medium">{s.packSize}er</td>
                <td className="px-4 py-2">{s.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActionForm action={receivePackagingStockAction} resetOnSuccess className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Packgrösse</label>
          <select
            name="packSize"
            required
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          >
            <option value={1}>1er</option>
            <option value={3}>3er</option>
            <option value={5}>5er</option>
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
        <div>
          <label className="mb-1 block text-sm font-medium">Notiz (optional)</label>
          <input
            type="text"
            name="note"
            placeholder="z.B. Lieferung Verpackungshersteller"
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          />
        </div>
        <SubmitButton>Verpackungsmaterial buchen</SubmitButton>
      </ActionForm>

      <ActionForm action={adjustPackagingStockAction} resetOnSuccess className="space-y-4">
        <p className="text-sm font-medium">Bestand korrigieren</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Für Inventurkorrekturen: tatsächlich gezählten Bestand eintragen statt einer
          Zu- oder Abgangsmenge.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium">Packgrösse</label>
          <select
            name="packSize"
            required
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          >
            {stock.map((s) => (
              <option key={s.packSize} value={s.packSize}>
                {s.packSize}er (aktuell {s.quantity})
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
          <label className="mb-1 block text-sm font-medium">Grund (optional)</label>
          <input
            type="text"
            name="note"
            placeholder="z.B. Inventur"
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          />
        </div>
        <SubmitButton>Korrektur buchen</SubmitButton>
      </ActionForm>
    </div>
  );
}
