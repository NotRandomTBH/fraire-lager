"use client";

import { syncShopifyAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function SyncPanel({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <span className="text-xs text-neutral-400">Shopify nicht verbunden</span>
    );
  }

  return (
    <ActionForm action={syncShopifyAction}>
      <SubmitButton className="!bg-white !text-neutral-900 border border-neutral-300">
        Mit Shopify synchronisieren
      </SubmitButton>
    </ActionForm>
  );
}
