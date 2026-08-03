"use client";

import { syncShopifyAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function SyncPanel({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <span className="text-xs text-neutral-400 dark:text-neutral-500">Shopify nicht verbunden</span>
    );
  }

  return (
    <ActionForm action={syncShopifyAction}>
      <SubmitButton className="!bg-white dark:!bg-neutral-800 !text-neutral-900 dark:!text-neutral-100 border border-neutral-300 dark:border-neutral-700">
        Mit Shopify synchronisieren
      </SubmitButton>
    </ActionForm>
  );
}
