export type ReorderStatus = "ROT" | "GELB" | "GRUEN" | "GRAU";

export type ReorderCalcInput = {
  dailyRate: number;
  currentStockUnits: number;
  leadTimeDays: number;
  safetyBufferDays: number;
  warningWindowDays: number;
};

export type ReorderCalcResult = {
  reorderPointUnits: number;
  runwayDays: number | null; // wie lange der Bestand komplett reicht (Stock / Rate)
  daysUntilMustOrder: number | null; // Tage bis der Bestellpunkt erreicht wird (kann negativ sein)
  suggestedOrderDate: Date | null;
  status: ReorderStatus;
};

// Reine Formel-Funktion, keine DB-Zugriffe – siehe reorder-calc.test.ts.
export function calculateReorderStatus(input: ReorderCalcInput): ReorderCalcResult {
  const { dailyRate, currentStockUnits, leadTimeDays, safetyBufferDays, warningWindowDays } =
    input;
  const reorderPointUnits = dailyRate * (leadTimeDays + safetyBufferDays);

  if (dailyRate <= 0) {
    return {
      reorderPointUnits,
      runwayDays: null,
      daysUntilMustOrder: null,
      suggestedOrderDate: null,
      status: "GRAU",
    };
  }

  const runwayDays = currentStockUnits / dailyRate;
  const daysUntilMustOrder = (currentStockUnits - reorderPointUnits) / dailyRate;
  const suggestedOrderDate = new Date();
  suggestedOrderDate.setDate(suggestedOrderDate.getDate() + Math.round(daysUntilMustOrder));

  const status: ReorderStatus =
    daysUntilMustOrder <= 0 ? "ROT" : daysUntilMustOrder <= warningWindowDays ? "GELB" : "GRUEN";

  return { reorderPointUnits, runwayDays, daysUntilMustOrder, suggestedOrderDate, status };
}
