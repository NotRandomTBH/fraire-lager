"use client";

import { useState } from "react";
import { recordMaxLagerSaleAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function MaxLagerSaleForm({
  sizes,
  packagingStock,
}: {
  sizes: { id: string; label: string; looseStock: number }[];
  packagingStock: { packSize: number; quantity: number }[];
}) {
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? "");
  const [packSize, setPackSize] = useState(packagingStock[0]?.packSize ?? 1);
  const [quantity, setQuantity] = useState(1);
  const today = new Date().toISOString().slice(0, 10);

  const size = sizes.find((s) => s.id === sizeId);
  const packaging = packagingStock.find((p) => p.packSize === packSize);
  const looseAvailable = size?.looseStock ?? 0;
  const packagingAvailable = packaging?.quantity ?? 0;
  const unitsNeeded = packSize * quantity;

  return (
    <ActionForm action={recordMaxLagerSaleAction} resetOnSuccess className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Grösse</label>
        <select
          name="sizeId"
          required
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        >
          {sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Packgrösse</label>
        <select
          name="packSize"
          required
          value={packSize}
          onChange={(e) => setPackSize(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        >
          {packagingStock.map((p) => (
            <option key={p.packSize} value={p.packSize}>
              {p.packSize}er
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Anzahl Packungen</label>
        <input
          type="number"
          name="quantity"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Verfügbar in Maxims Lager: <strong>{looseAvailable}</strong> lose Teile ({size?.label}),{" "}
        <strong>{packagingAvailable}</strong> {packSize}er-Verpackungen · benötigt{" "}
        <strong className={unitsNeeded > looseAvailable ? "text-red-600 dark:text-red-400" : ""}>{unitsNeeded}</strong>{" "}
        lose Teile + <strong className={quantity > packagingAvailable ? "text-red-600 dark:text-red-400" : ""}>{quantity}</strong>{" "}
        Verpackung(en)
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">Empfänger / Kunde (optional)</label>
        <input
          type="text"
          name="recipient"
          placeholder="z.B. Name / Firma"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz (optional)</label>
        <input
          type="text"
          name="note"
          placeholder="z.B. Bestellnummer"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Datum</label>
        <input
          type="date"
          name="date"
          defaultValue={today}
          required
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Bucht den Verkauf aus Maxims Lager und erhöht – falls die Kombination mit Shopify
        verknüpft ist – den Shopify-Bestand automatisch um die verkaufte Menge, da Shopify beim
        Bestelleingang bereits abgezogen hat, ohne dass das Hauptlager etwas hergegeben hat.
      </p>

      <SubmitButton>Verkauf buchen</SubmitButton>
    </ActionForm>
  );
}
