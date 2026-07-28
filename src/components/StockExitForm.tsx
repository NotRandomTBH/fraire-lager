"use client";

import { useState } from "react";
import { recordStockExitAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

type SizeWithVariants = {
  id: string;
  label: string;
  looseStock: number;
  shopifyVariants: { packSize: number; packStock: number; shopifyVariantId: string }[];
};

export function StockExitForm({
  sizes,
  shopifyConfigured,
}: {
  sizes: SizeWithVariants[];
  shopifyConfigured: boolean;
}) {
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? "");
  const [packed, setPacked] = useState(false);
  const [packSize, setPackSize] = useState(3);
  const [quantity, setQuantity] = useState(1);

  const size = sizes.find((s) => s.id === sizeId);
  const variant = size?.shopifyVariants.find((v) => v.packSize === packSize);
  const available = packed ? (variant?.packStock ?? 0) : (size?.looseStock ?? 0);
  const remaining = available - quantity;
  const variantLinked = Boolean(variant?.shopifyVariantId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ActionForm action={recordStockExitAction} resetOnSuccess className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Grösse</label>
        <select
          name="sizeId"
          required
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          {sizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={!packed} onChange={() => setPacked(false)} />
          Lose Teile
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={packed} onChange={() => setPacked(true)} />
          Packung
        </label>
      </div>

      {packed ? (
        <div>
          <label className="mb-1 block text-sm font-medium">Packungsgrösse</label>
          <select
            name="packSize"
            value={packSize}
            onChange={(e) => setPackSize(Number(e.target.value))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2"
          >
            <option value={1}>1er</option>
            <option value={3}>3er</option>
            <option value={5}>5er</option>
          </select>
        </div>
      ) : (
        <input type="hidden" name="packSize" value="" />
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">
          Anzahl {packed ? "Packungen" : "Stück"}
        </label>
        <input
          type="number"
          name="quantity"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <p className="text-sm text-neutral-600">
        Verfügbar: <strong>{available}</strong> {packed ? `${packSize}er-Packungen` : "lose Teile"} ·
        danach noch{" "}
        <strong className={remaining < 0 ? "text-red-600" : ""}>{remaining}</strong>
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">Begründung</label>
        <input
          type="text"
          name="reason"
          required
          placeholder="z.B. Muster für Influencer, Ersatzlieferung"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Empfänger (optional)</label>
        <input
          type="text"
          name="recipient"
          placeholder="z.B. Name / Firma"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Datum</label>
        <input
          type="date"
          name="date"
          defaultValue={today}
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      {packed && shopifyConfigured && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pushToShopify" defaultChecked={false} disabled={!variantLinked} />
          An Shopify übertragen (Bestand dort auch reduzieren)
          {!variantLinked && (
            <span className="text-neutral-400">– keine Variante verknüpft</span>
          )}
        </label>
      )}

      <SubmitButton>Austragen</SubmitButton>
    </ActionForm>
  );
}
