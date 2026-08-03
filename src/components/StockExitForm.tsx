"use client";

import { useState } from "react";
import { recordStockExitAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { todayDateInputValue } from "@/lib/date";
import { stockExitItemLabel } from "@/lib/labels";

type SizeWithVariants = {
  id: string;
  label: string;
  looseStock: number;
  shopifyVariants: { packSize: number; packStock: number; shopifyVariantId: string }[];
};

type ItemType = "UNTERHOSE" | "VERPACKUNGSMATERIAL" | "KARTON";

type ExitItem = {
  itemType: ItemType;
  sizeId: string | null;
  sizeLabel: string | null;
  packSize: number | null;
  quantity: number;
};

export function StockExitForm({
  sizes,
  shopifyConfigured,
  packagingStock,
  cartonStock,
}: {
  sizes: SizeWithVariants[];
  shopifyConfigured: boolean;
  packagingStock: { packSize: number; quantity: number }[];
  cartonStock: number;
}) {
  const [itemType, setItemType] = useState<ItemType>("UNTERHOSE");
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? "");
  const [packed, setPacked] = useState(false);
  const [packSize, setPackSize] = useState(3);
  const [materialPackSize, setMaterialPackSize] = useState(packagingStock[0]?.packSize ?? 1);
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<ExitItem[]>([]);
  const today = todayDateInputValue();

  const size = sizes.find((s) => s.id === sizeId);
  const variant = size?.shopifyVariants.find((v) => v.packSize === packSize);

  const material = packagingStock.find((p) => p.packSize === materialPackSize);

  const available =
    itemType === "KARTON"
      ? cartonStock
      : itemType === "VERPACKUNGSMATERIAL"
        ? (material?.quantity ?? 0)
        : packed
          ? (variant?.packStock ?? 0)
          : (size?.looseStock ?? 0);
  const remaining = available - quantity;

  function currentItem(): ExitItem {
    if (itemType === "KARTON") {
      return { itemType, sizeId: null, sizeLabel: null, packSize: null, quantity };
    }
    if (itemType === "VERPACKUNGSMATERIAL") {
      return { itemType, sizeId: null, sizeLabel: null, packSize: materialPackSize, quantity };
    }
    return {
      itemType,
      sizeId,
      sizeLabel: size?.label ?? null,
      packSize: packed ? packSize : null,
      quantity,
    };
  }

  function addPosition() {
    if (quantity <= 0) return;
    setItems((prev) => [...prev, currentItem()]);
    setQuantity(1);
  }

  function removePosition(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Wenn keine Position explizit hinzugefügt wurde, wird beim Absenden die
  // aktuell im Formular gewählte Position als einzelne Buchung verwendet –
  // Einzel-Austrag bleibt dadurch genauso einfach wie zuvor.
  const effectiveItems = items.length > 0 ? items : [currentItem()];
  const hasEligibleShopifyItem = effectiveItems.some(
    (i) => i.itemType === "UNTERHOSE" && i.packSize,
  );

  return (
    <ActionForm
      action={recordStockExitAction}
      resetOnSuccess
      className="space-y-4"
      onSuccess={() => setItems([])}
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Was wird ausgetragen?</label>
        <select
          value={itemType}
          onChange={(e) => {
            setItemType(e.target.value as ItemType);
            setQuantity(1);
          }}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        >
          <option value="UNTERHOSE">Unterhosen</option>
          <option value="VERPACKUNGSMATERIAL">Verpackungsmaterial</option>
          <option value="KARTON">Versandkartons</option>
        </select>
      </div>

      {itemType === "UNTERHOSE" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">Grösse</label>
            <select
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

          {packed && (
            <div>
              <label className="mb-1 block text-sm font-medium">Packungsgrösse</label>
              <select
                value={packSize}
                onChange={(e) => setPackSize(Number(e.target.value))}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
              >
                <option value={1}>1er</option>
                <option value={3}>3er</option>
                <option value={5}>5er</option>
              </select>
            </div>
          )}
        </>
      )}

      {itemType === "VERPACKUNGSMATERIAL" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Packgrösse</label>
          <select
            value={materialPackSize}
            onChange={(e) => setMaterialPackSize(Number(e.target.value))}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
          >
            {packagingStock.map((p) => (
              <option key={p.packSize} value={p.packSize}>
                {p.packSize}er
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">
          Anzahl {itemType === "UNTERHOSE" && packed ? "Packungen" : "Stück"}
        </label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Verfügbar: <strong>{available}</strong> ·
        danach noch{" "}
        <strong className={remaining < 0 ? "text-red-600 dark:text-red-400" : ""}>{remaining}</strong>
      </p>

      <button
        type="button"
        onClick={addPosition}
        disabled={quantity <= 0}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        + Position hinzufügen
      </button>

      {items.length > 0 && (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
          <p className="mb-2 text-sm font-medium">{items.length} Position(en) in dieser Buchung</p>
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>
                  {it.quantity} × {stockExitItemLabel({ itemType: it.itemType, size: it.sizeLabel ? { label: it.sizeLabel } : null, packSize: it.packSize })}
                </span>
                <button
                  type="button"
                  onClick={() => removePosition(i)}
                  className="text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  entfernen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Begründung</label>
        <input
          type="text"
          name="reason"
          required
          placeholder="z.B. Muster für Influencer, Ersatzlieferung"
          className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Empfänger (optional)</label>
        <input
          type="text"
          name="recipient"
          placeholder="z.B. Name / Firma"
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

      {shopifyConfigured && hasEligibleShopifyItem && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pushToShopify" defaultChecked={false} />
          An Shopify übertragen (Bestand dort für verpackte Unterhosen-Positionen auch reduzieren)
        </label>
      )}

      <input type="hidden" name="items" value={JSON.stringify(effectiveItems)} />

      <SubmitButton>
        {effectiveItems.length > 1 ? `${effectiveItems.length} Positionen austragen` : "Austragen"}
      </SubmitButton>
    </ActionForm>
  );
}
