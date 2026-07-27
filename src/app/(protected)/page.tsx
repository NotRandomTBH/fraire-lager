import Link from "next/link";
import { getBestSellers, listPackagingStock, listSizesWithVariants } from "@/lib/inventory";
import { computeAllSizeForecasts, computePackagingForecast, worstStatus } from "@/lib/reorder";
import { isShopifyConfigured, syncInventoryLevelsIfStale } from "@/lib/shopify";
import { SyncPanel } from "@/components/SyncPanel";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function formatDays(days: number | null) {
  if (days === null) return "–";
  const rounded = Math.round(days);
  return rounded <= 0 ? "jetzt" : `${rounded} Tage`;
}

export default async function DashboardPage() {
  await syncInventoryLevelsIfStale();

  const [sizes, bestSellers, packagingStock, sizeForecasts, packagingForecasts] =
    await Promise.all([
      listSizesWithVariants(),
      getBestSellers(30),
      listPackagingStock(),
      computeAllSizeForecasts(),
      Promise.all([1, 3, 5].map((packSize) => computePackagingForecast(packSize))),
    ]);

  const alerts = sizes.filter((s) => s.looseStock < s.reorderThreshold);
  const forecastBySizeId = new Map(sizeForecasts.map((f) => [f.sizeId, f]));
  const worst = worstStatus(sizeForecasts);
  const worstPackaging = worstStatus(
    packagingForecasts.map((p) => ({ sizeLabel: `${p.packSize}er`, calc: p.calc })),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <SyncPanel configured={isShopifyConfigured()} />
      </div>

      {worst && (
        <div
          className={`rounded-md border p-4 ${
            worst.status === "ROT"
              ? "border-red-300 bg-red-50"
              : worst.status === "GELB"
                ? "border-amber-300 bg-amber-50"
                : "border-neutral-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">Nachbestell-Prognose (automatisch)</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Schlechtester Status: <strong>{worst.sizeLabels.join(", ")}</strong> – da ihr in
                einer MOQ-Charge für alle Grössen zusammen bestellt, ist das der massgebliche
                Zeitpunkt.
              </p>
            </div>
            <StatusBadge status={worst.status} />
          </div>
          <Link href="/analytics" className="mt-2 inline-block text-sm text-neutral-500 underline">
            Details pro Grösse ansehen
          </Link>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-900">Nachbestellen (manueller Schwellenwert)</h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {alerts.map((a) => (
              <li key={a.id}>
                Grösse <strong>{a.label}</strong>: nur noch{" "}
                <strong>{a.looseStock}</strong> lose Teile (Schwelle {a.reorderThreshold})
              </li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h2 className="mb-3 font-medium">Lagerbestand pro Grösse</h2>
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-2">Grösse</th>
                <th className="px-4 py-2">Lose Teile</th>
                <th className="px-4 py-2">Gesamt (Stück)</th>
                <th className="px-4 py-2">Ampel</th>
                <th className="px-4 py-2">Bis Bestellpunkt</th>
                <th className="px-4 py-2">Manuelle Schwelle</th>
                <th className="px-4 py-2">Shopify-Packungen</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => {
                const forecast = forecastBySizeId.get(s.id);
                return (
                  <tr key={s.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 font-medium">{s.label}</td>
                    <td className="px-4 py-2">{s.looseStock}</td>
                    <td className="px-4 py-2">{forecast?.currentStockUnits ?? "–"}</td>
                    <td className="px-4 py-2">
                      {forecast && <StatusBadge status={forecast.calc.status} compact />}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {formatDays(forecast?.calc.daysUntilMustOrder ?? null)}
                      {forecast?.lowConfidence && (
                        <span className="ml-1 text-xs text-neutral-400">(geringe Datenbasis)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">{s.reorderThreshold}</td>
                    <td className="px-4 py-2 text-neutral-600">
                      {s.shopifyVariants
                        .map((v) => `${v.packSize}er: ${v.packStock}`)
                        .join(" · ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-medium">Verpackungsmaterial</h2>
          {worstPackaging && <StatusBadge status={worstPackaging.status} compact />}
        </div>
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-2">Packgrösse</th>
                <th className="px-4 py-2">Bestand</th>
                <th className="px-4 py-2">Ampel</th>
                <th className="px-4 py-2">Bis Bestellpunkt</th>
              </tr>
            </thead>
            <tbody>
              {packagingStock.map((p) => {
                const forecast = packagingForecasts.find((f) => f.packSize === p.packSize);
                return (
                  <tr key={p.packSize} className="border-t border-neutral-100">
                    <td className="px-4 py-2 font-medium">{p.packSize}er</td>
                    <td className="px-4 py-2">{p.quantity}</td>
                    <td className="px-4 py-2">
                      {forecast && <StatusBadge status={forecast.calc.status} compact />}
                    </td>
                    <td className="px-4 py-2 text-neutral-600">
                      {formatDays(forecast?.calc.daysUntilMustOrder ?? null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Bestseller (letzte 30 Tage, aus Shopify-Verkäufen)</h2>
        {bestSellers.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Noch keine Verkaufsdaten.{" "}
            {isShopifyConfigured()
              ? "Oben rechts synchronisieren."
              : "Shopify-Anbindung in den Einstellungen konfigurieren."}
          </p>
        ) : (
          <ol className="space-y-1 text-sm">
            {bestSellers.map((b, i) => (
              <li key={`${b.sizeLabel}-${b.packSize}`} className="flex gap-2">
                <span className="text-neutral-400">{i + 1}.</span>
                <span>
                  {b.sizeLabel} – {b.packSize}er Pack:{" "}
                  <strong>{b.unitsSold}</strong> verkaufte Packungen
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex gap-3 text-sm">
        <Link href="/wareneingang" className="rounded-md border border-neutral-300 px-4 py-2">
          Wareneingang buchen
        </Link>
        <Link href="/verpacken" className="rounded-md border border-neutral-300 px-4 py-2">
          Packung verpacken
        </Link>
        <Link href="/analytics" className="rounded-md border border-neutral-300 px-4 py-2">
          Analytics
        </Link>
      </div>
    </div>
  );
}
