"use client";

import { saveLocationAction } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function LocationForm({
  locations,
  currentLocationId,
}: {
  locations: { id: string; name: string }[];
  currentLocationId: string;
}) {
  return (
    <ActionForm action={saveLocationAction} className="flex items-center gap-3">
      <label className="text-sm font-medium">Lagerort in Shopify</label>
      <select
        name="locationId"
        defaultValue={currentLocationId}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="">– auswählen –</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <SubmitButton>Speichern</SubmitButton>
    </ActionForm>
  );
}
