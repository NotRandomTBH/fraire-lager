import { prisma } from "@/lib/prisma";
import { calculateReorderStatus, type ReorderCalcResult } from "@/lib/reorder-calc";

export { calculateReorderStatus };
export type { ReorderCalcInput, ReorderCalcResult, ReorderStatus } from "@/lib/reorder-calc";

const DEFAULT_SETTINGS = { leadTimeDays: 80, safetyBufferDays: 14, warningWindowDays: 30 };

export async function getReorderSettings() {
  return prisma.reorderSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", ...DEFAULT_SETTINGS },
  });
}

export async function updateReorderSettings(input: {
  leadTimeDays: number;
  safetyBufferDays: number;
  warningWindowDays: number;
}) {
  return prisma.reorderSettings.upsert({
    where: { id: "singleton" },
    update: input,
    create: { id: "singleton", ...input },
  });
}

function startOfDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function dailyRateForSize(sizeId: string, windowDays: number) {
  const since = startOfDaysAgo(windowDays);
  const rows = await prisma.dailySales.findMany({
    where: { sizeId, date: { gte: since } },
  });
  const totalUnits = rows.reduce((sum, r) => sum + r.packsSold * r.packSize, 0);
  return totalUnits / windowDays;
}

async function earliestSaleDate(sizeId: string) {
  const first = await prisma.dailySales.findFirst({
    where: { sizeId },
    orderBy: { date: "asc" },
  });
  return first?.date ?? null;
}

export type SizeForecast = {
  sizeId: string;
  sizeLabel: string;
  currentStockUnits: number;
  looseStock: number;
  packedBreakdown: { packSize: number; packStock: number; units: number }[];
  rate7: number;
  rate30: number;
  historyDays: number | null;
  lowConfidence: boolean;
  manualThreshold: number;
  calc: ReorderCalcResult;
  reasoning: string;
};

const LOW_CONFIDENCE_THRESHOLD_DAYS = 14;

export async function computeSizeForecast(sizeId: string): Promise<SizeForecast> {
  const [size, settings, rate7, rate30, earliest] = await Promise.all([
    prisma.size.findUniqueOrThrow({
      where: { id: sizeId },
      include: { shopifyVariants: { orderBy: { packSize: "asc" } } },
    }),
    getReorderSettings(),
    dailyRateForSize(sizeId, 7),
    dailyRateForSize(sizeId, 30),
    earliestSaleDate(sizeId),
  ]);

  const packedBreakdown = size.shopifyVariants.map((v) => ({
    packSize: v.packSize,
    packStock: v.packStock,
    units: v.packStock * v.packSize,
  }));
  const currentStockUnits =
    size.looseStock + packedBreakdown.reduce((sum, p) => sum + p.units, 0);

  const historyDays = earliest
    ? Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const lowConfidence = historyDays === null || historyDays < LOW_CONFIDENCE_THRESHOLD_DAYS;

  const calc = calculateReorderStatus({
    dailyRate: rate7,
    currentStockUnits,
    leadTimeDays: settings.leadTimeDays,
    safetyBufferDays: settings.safetyBufferDays,
    warningWindowDays: settings.warningWindowDays,
  });

  const reasoning = buildReasoning({
    label: size.label,
    rate: rate7,
    windowLabel: "7-Tage-Schnitt",
    currentStockUnits,
    settings,
    calc,
    lowConfidence,
    historyDays,
  });

  return {
    sizeId: size.id,
    sizeLabel: size.label,
    currentStockUnits,
    looseStock: size.looseStock,
    packedBreakdown,
    rate7,
    rate30,
    historyDays,
    lowConfidence,
    manualThreshold: size.reorderThreshold,
    calc,
    reasoning,
  };
}

export async function computeAllSizeForecasts(): Promise<SizeForecast[]> {
  const sizes = await prisma.size.findMany({ orderBy: { order: "asc" } });
  return Promise.all(sizes.map((s) => computeSizeForecast(s.id)));
}

// Für die Gesamtstatus-Zusammenfassung: eine MOQ-Bestellung deckt alle Grössen
// zusammen ab, daher zählt die schlechteste Ampel unter allen Grössen.
const STATUS_SEVERITY: Record<ReorderCalcResult["status"], number> = {
  ROT: 3,
  GELB: 2,
  GRAU: 1,
  GRUEN: 0,
};

export function worstStatus(forecasts: { sizeLabel: string; calc: ReorderCalcResult }[]) {
  if (forecasts.length === 0) return null;
  const worstSeverity = Math.max(...forecasts.map((f) => STATUS_SEVERITY[f.calc.status]));
  const status = (Object.keys(STATUS_SEVERITY) as ReorderCalcResult["status"][]).find(
    (s) => STATUS_SEVERITY[s] === worstSeverity,
  )!;
  const sizeLabels = forecasts
    .filter((f) => STATUS_SEVERITY[f.calc.status] === worstSeverity)
    .map((f) => f.sizeLabel);
  return { status, sizeLabels };
}

// Tagesverkäufe (in Stück, über alle Packgrössen summiert) für den Chart auf
// der Analytics-Seite. Tage ohne Verkauf werden als 0 aufgefüllt.
export async function getDailyUnitsSeries(sizeId: string, days = 45) {
  const since = startOfDaysAgo(days - 1);
  const rows = await prisma.dailySales.findMany({
    where: { sizeId, date: { gte: since } },
  });

  const unitsByDay = new Map<number, number>();
  for (const r of rows) {
    const key = r.date.getTime();
    unitsByDay.set(key, (unitsByDay.get(key) ?? 0) + r.packsSold * r.packSize);
  }

  const series: { date: Date; units: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    series.push({ date: d, units: unitsByDay.get(d.getTime()) ?? 0 });
  }
  return series;
}

export type PackagingForecast = {
  packSize: number;
  currentStockUnits: number;
  rate7: number;
  rate30: number;
  historyDays: number | null;
  lowConfidence: boolean;
  calc: ReorderCalcResult;
  reasoning: string;
};

async function packagingDailyRate(packSize: number, windowDays: number) {
  const since = startOfDaysAgo(windowDays);
  const rows = await prisma.packagingMovement.findMany({
    where: { packSize, type: "USED", createdAt: { gte: since } },
  });
  const totalUsed = rows.reduce((sum, r) => sum + Math.abs(r.quantityDelta), 0);
  return totalUsed / windowDays;
}

async function earliestPackagingUsage(packSize: number) {
  const first = await prisma.packagingMovement.findFirst({
    where: { packSize, type: "USED" },
    orderBy: { createdAt: "asc" },
  });
  return first?.createdAt ?? null;
}

export async function computePackagingForecast(packSize: number): Promise<PackagingForecast> {
  const [stock, settings, rate7, rate30, earliest] = await Promise.all([
    prisma.packagingStock.findUnique({ where: { packSize } }),
    getReorderSettings(),
    packagingDailyRate(packSize, 7),
    packagingDailyRate(packSize, 30),
    earliestPackagingUsage(packSize),
  ]);

  const currentStockUnits = stock?.quantity ?? 0;
  const historyDays = earliest
    ? Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const lowConfidence = historyDays === null || historyDays < LOW_CONFIDENCE_THRESHOLD_DAYS;

  const calc = calculateReorderStatus({
    dailyRate: rate7,
    currentStockUnits,
    leadTimeDays: settings.leadTimeDays,
    safetyBufferDays: settings.safetyBufferDays,
    warningWindowDays: settings.warningWindowDays,
  });

  const reasoning = buildReasoning({
    label: `${packSize}er-Verpackung`,
    rate: rate7,
    windowLabel: "7-Tage-Schnitt",
    currentStockUnits,
    settings,
    calc,
    lowConfidence,
    historyDays,
  });

  return { packSize, currentStockUnits, rate7, rate30, historyDays, lowConfidence, calc, reasoning };
}

function buildReasoning(input: {
  label: string;
  rate: number;
  windowLabel: string;
  currentStockUnits: number;
  settings: { leadTimeDays: number; safetyBufferDays: number };
  calc: ReorderCalcResult;
  lowConfidence: boolean;
  historyDays: number | null;
}): string {
  const { label, rate, windowLabel, currentStockUnits, settings, calc, lowConfidence, historyDays } =
    input;

  const lowConfidenceNote = lowConfidence
    ? historyDays === null
      ? " Datenbasis noch gering (keine Verkaufshistorie) – Zahl ist noch nicht belastbar."
      : ` Datenbasis noch gering (nur ${historyDays} ${historyDays === 1 ? "Tag" : "Tage"} Historie) – Zahl ist noch nicht sehr belastbar.`
    : "";

  if (rate <= 0) {
    return `${label}: Noch keine Verkäufe/Verbrauch im Betrachtungszeitraum, daher keine Prognose möglich.${lowConfidenceNote}`;
  }

  const runway = calc.runwayDays !== null ? Math.round(calc.runwayDays) : "?";
  const daysUntil =
    calc.daysUntilMustOrder !== null ? Math.max(0, Math.round(calc.daysUntilMustOrder)) : "?";
  const statusLabel: Record<ReorderCalcResult["status"], string> = {
    ROT: "Rot",
    GELB: "Gelb",
    GRUEN: "Grün",
    GRAU: "Keine Daten",
  };

  return (
    `Bei Ø ${rate.toFixed(1)} Stück/Tag (${windowLabel}) und ${currentStockUnits} Stück Bestand ` +
    `reicht der Vorrat noch ~${runway} Tage. Bei ${settings.leadTimeDays} Tagen Lieferzeit + ` +
    `${settings.safetyBufferDays} Tagen Puffer solltet ihr spätestens in ${daysUntil} Tagen ` +
    `bestellen → Status ${statusLabel[calc.status]}.${lowConfidenceNote}`
  );
}
