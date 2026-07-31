// Reine Formatierungs-Helfer für Defekt-/Austrags-Einträge, die sich je nach
// itemType auf Unterhosen (Grösse), Verpackungsmaterial (Packgrösse) oder
// Versandkartons beziehen können. Keine Server-Abhängigkeiten, damit sowohl
// Server-Code (PDF, Actions) als auch Client-Komponenten sie nutzen können.

export function defectItemLabel(input: {
  itemType: string;
  size?: { label: string } | null;
  packSize?: number | null;
}): string {
  if (input.itemType === "VERPACKUNG") return `Verpackung ${input.packSize}er`;
  if (input.itemType === "KARTON") return "Versandkarton";
  return `Grösse ${input.size?.label ?? "?"}`;
}

export function stockExitItemLabel(input: {
  itemType: string;
  size?: { label: string } | null;
  packSize?: number | null;
}): string {
  if (input.itemType === "VERPACKUNGSMATERIAL") return `Verpackungsmaterial ${input.packSize}er`;
  if (input.itemType === "KARTON") return "Versandkarton";
  const size = input.size?.label ?? "?";
  return input.packSize ? `Grösse ${size} (${input.packSize}er-Packung)` : `Grösse ${size} (lose)`;
}
