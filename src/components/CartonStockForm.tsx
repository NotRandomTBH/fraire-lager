"use client";

import { adjustCartonStockAction, receiveCartonStockAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function CartonStockForm({ quantity }: { quantity: number }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-2">Versandkartons</th>
              <th className="px-4 py-2">Bestand</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-neutral-100">
              <td className="px-4 py-2 font-medium">Kartons</td>
              <td className="px-4 py-2">{quantity}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ActionForm action={receiveCartonStockAction} resetOnSuccess className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Anzahl</label>
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
            placeholder="z.B. Lieferung Kartonhersteller"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <SubmitButton>Kartons buchen</SubmitButton>
      </ActionForm>

      <ActionForm action={adjustCartonStockAction} resetOnSuccess className="space-y-4">
        <p className="text-sm font-medium">Bestand korrigieren</p>
        <p className="text-sm text-neutral-600">
          Für Inventurkorrekturen: tatsächlich gezählten Bestand eintragen statt einer
          Zu- oder Abgangsmenge.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium">Tatsächlicher Bestand</label>
          <input
            type="number"
            name="newQuantity"
            min={0}
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Grund (optional)</label>
          <input
            type="text"
            name="note"
            placeholder="z.B. Inventur"
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <SubmitButton>Korrektur buchen</SubmitButton>
      </ActionForm>
    </div>
  );
}
