"use client";

import { updateThresholdAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function ThresholdForm({
  sizeId,
  label,
  value,
}: {
  sizeId: string;
  label: string;
  value: number;
}) {
  return (
    <ActionForm action={updateThresholdAction} className="flex items-center gap-3">
      <input type="hidden" name="sizeId" value={sizeId} />
      <span className="w-10 text-sm font-medium">{label}</span>
      <input
        type="number"
        name="reorderThreshold"
        min={0}
        defaultValue={value}
        className="w-24 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"
      />
      <SubmitButton className="!px-3 !py-1.5">Speichern</SubmitButton>
    </ActionForm>
  );
}
