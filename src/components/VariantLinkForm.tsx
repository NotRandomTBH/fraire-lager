"use client";

import { linkShopifyVariantAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function VariantLinkForm({
  variantId,
  disabled,
}: {
  variantId: string;
  disabled: boolean;
}) {
  return (
    <ActionForm action={linkShopifyVariantAction} className="flex items-center gap-2">
      <input type="hidden" name="variantId" value={variantId} />
      <input
        type="text"
        name="sku"
        placeholder="SKU"
        disabled={disabled}
        className="w-32 rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-sm disabled:bg-neutral-100 dark:bg-neutral-800"
      />
      <SubmitButton className="!px-3 !py-1 !text-xs">Verknüpfen</SubmitButton>
    </ActionForm>
  );
}
