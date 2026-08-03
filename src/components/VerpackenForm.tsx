"use client";

import { useMemo, useState } from "react";
import { packStockAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

type SizeWithVariants = {
  id: string;
  label: string;
  looseStock: number;
  shopifyVariants: { packSize: number; shopifyVariantId: string }[];
};

export function VerpackenForm({
  sizes,
  shopifyConfigured,
  packagingStock,
}: {
  sizes: SizeWithVariants[];
  shopifyConfigured: boolean;
  packagingStock: { packSize: number; quantity: number }[];
}) {
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? "");
  const [packSize, setPackSize] = useState(3);
  const [packQuantity, setPackQuantity] = useState(1);

  const size = sizes.find((s) => s.id === sizeId);
  const unitsNeeded = packSize * packQuantity;
  const remaining = (size?.looseStock ?? 0) - unitsNeeded;
  const variantLinked = useMemo(
    () => Boolean(size?.shopifyVariants.find((v) => v.packSize === packSize)?.shopifyVariantId),
    [size, packSize],
  );
  const packagingAvailable = packagingStock.find((p) => p.packSize === packSize)?.quantity ?? 0;
  const packagingRemaining = packagingAvailable - packQuantity;

  return (
    <ActionForm action={packStockAction} resetOnSuccess className="space-y-4">
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
              {s.label} ({s.looseStock} lose Teile auf Lager)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Packungsgrösse</label>
        <select
          name="packSize"
          required
          value={packSize}
          onChange={(e) => setPackSize(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        >
          <option value={1}>1er</option>
          <option value={3}>3er</option>
          <option value={5}>5er</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Anzahl Packungen</label>
        <input
          type="number"
          name="packQuantity"
          min={1}
          required
          value={packQuantity}
          onChange={(e) => setPackQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Benötigt: <strong>{unitsNeeded}</strong> lose Teile · danach noch{" "}
        <strong className={remaining < 0 ? "text-red-600 dark:text-red-400" : ""}>{remaining}</strong> auf
        Lager
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Verpackungsmaterial {packSize}er: <strong>{packagingAvailable}</strong> vorhanden ·
        danach noch{" "}
        <strong className={packagingRemaining < 0 ? "text-red-600 dark:text-red-400" : ""}>
          {packagingRemaining}
        </strong>
      </p>

      {shopifyConfigured && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pushToShopify"
            defaultChecked={variantLinked}
            disabled={!variantLinked}
          />
          An Shopify übertragen (Packungsbestand erhöhen)
          {!variantLinked && (
            <span className="text-neutral-400 dark:text-neutral-500">– keine Variante verknüpft</span>
          )}
        </label>
      )}

      <SubmitButton>Verpacken</SubmitButton>
    </ActionForm>
  );
}
