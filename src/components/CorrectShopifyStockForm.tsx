"use client";

import { correctShopifyStockAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function CorrectShopifyStockForm({ variantId }: { variantId: string }) {
  return (
    <ActionForm
      action={correctShopifyStockAction}
      resetOnSuccess
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="variantId" value={variantId} />
      <input
        type="number"
        name="newQuantity"
        min={0}
        placeholder="korrekte Menge"
        required
        className="w-28 rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-sm"
      />
      <SubmitButton className="!px-3 !py-1 !text-xs">Korrigieren</SubmitButton>
    </ActionForm>
  );
}
