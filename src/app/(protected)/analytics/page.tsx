import {
  computeAllSizeForecasts,
  computePackagingForecast,
  getDailyUnitsSeries,
  getReorderSettings,
} from "@/lib/reorder";
import { StatusBadge } from "@/components/StatusBadge";
import { DailyUnitsChart } from "@/components/DailyUnitsChart";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [forecasts, settings, packagingForecasts] = await Promise.all([
    computeAllSizeForecasts(),
    getReorderSettings(),
    Promise.all([1, 3, 5].map((packSize) => computePackagingForecast(packSize))),
  ]);

  const series = await Promise.all(
    forecasts.map((f) => getDailyUnitsSeries(f.sizeId, 45)),
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-neutral-600">
          Live bei jedem Aufruf neu berechnet. Parameter (Lieferzeit{" "}
          {settings.leadTimeDays} Tage, Puffer {settings.safetyBufferDays} Tage,
          Warnfenster {settings.warningWindowDays} Tage) unter Einstellungen anpassbar.
        </p>
      </div>

      <div className="space-y-8">
        {forecasts.map((f, i) => (
          <section key={f.sizeId} className="rounded-md border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Grösse {f.sizeLabel}</h2>
              <StatusBadge status={f.calc.status} />
            </div>

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-neutral-600">
                Tagesverkäufe (Stück, letzte 45 Tage)
              </h3>
              <DailyUnitsChart series={series[i]} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <div className="text-neutral-500">Bestand gesamt</div>
                <div className="text-lg font-semibold">{f.currentStockUnits} Stück</div>
                <div className="text-xs text-neutral-400">
                  lose: {f.looseStock} ·{" "}
                  {f.packedBreakdown.map((p) => `${p.packSize}er: ${p.packStock}`).join(" · ")}
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Ø/Tag (7d / 30d)</div>
                <div className="text-lg font-semibold">
                  {f.rate7.toFixed(1)} / {f.rate30.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Bestellpunkt</div>
                <div className="text-lg font-semibold">
                  {Math.round(f.calc.reorderPointUnits)} Stück
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Bis Bestellpunkt</div>
                <div className="text-lg font-semibold">
                  {f.calc.daysUntilMustOrder === null
                    ? "–"
                    : `${Math.round(f.calc.daysUntilMustOrder)} Tage`}
                </div>
                {f.calc.suggestedOrderDate && (
                  <div className="text-xs text-neutral-400">
                    ca. {f.calc.suggestedOrderDate.toLocaleDateString("de-CH")}
                  </div>
                )}
              </div>
            </div>

            <p
              className={`mt-4 rounded-md p-3 text-sm ${
                f.lowConfidence ? "bg-amber-50 text-amber-900" : "bg-neutral-50 text-neutral-700"
              }`}
            >
              {f.reasoning}
            </p>

            <p className="mt-2 text-xs text-neutral-400">
              Manueller Mindestbestand (Override, lose Teile): {f.manualThreshold} — unter{" "}
              <a href="/einstellungen" className="underline">
                Einstellungen
              </a>{" "}
              änderbar.
            </p>
          </section>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Verpackungsmaterial (niedrigere Priorität)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {packagingForecasts.map((p) => (
            <div key={p.packSize} className="rounded-md border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.packSize}er</span>
                <StatusBadge status={p.calc.status} compact />
              </div>
              <div className="mt-2 text-sm text-neutral-600">
                Bestand: {p.currentStockUnits} · Ø/Tag: {p.rate7.toFixed(1)}
              </div>
              <p className="mt-2 text-xs text-neutral-500">{p.reasoning}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
