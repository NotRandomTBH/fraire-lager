"use client";

import { updateReorderSettingsAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function ReorderSettingsForm({
  settings,
}: {
  settings: { leadTimeDays: number; safetyBufferDays: number; warningWindowDays: number };
}) {
  return (
    <ActionForm action={updateReorderSettingsAction} className="max-w-md space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Lieferzeit (Tage)</label>
        <input
          type="number"
          name="leadTimeDays"
          min={0}
          defaultValue={settings.leadTimeDays}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Inkl. Puffer für Verzögerungen (Standard 80 Tage).
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Sicherheitspuffer (Tage)</label>
        <input
          type="number"
          name="safetyBufferDays"
          min={0}
          defaultValue={settings.safetyBufferDays}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Warnfenster (Tage, Gelb-Schwelle)</label>
        <input
          type="number"
          name="warningWindowDays"
          min={0}
          defaultValue={settings.warningWindowDays}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>
      <SubmitButton>Speichern</SubmitButton>
    </ActionForm>
  );
}
