import { prisma } from "@/lib/prisma";
import { listPackagingStock } from "@/lib/inventory";
import {
  listMaxLagerPackagingStock,
  listMaxLagerSales,
  listMaxLagerStock,
} from "@/lib/maxlager";
import { MaxLagerTransferForm } from "@/components/MaxLagerTransferForm";
import { MaxLagerSaleForm } from "@/components/MaxLagerSaleForm";
import { MaxLagerAdjustForm } from "@/components/MaxLagerAdjustForm";

export const dynamic = "force-dynamic";

export default async function MaxLagerPage() {
  const [hauptlagerSizes, hauptlagerPackaging, maxStock, maxPackaging, recentSales] =
    await Promise.all([
      prisma.size.findMany({ orderBy: { order: "asc" } }),
      listPackagingStock(),
      listMaxLagerStock(),
      listMaxLagerPackagingStock(),
      listMaxLagerSales(20),
    ]);

  const maxSizesForForms = maxStock.map((s) => ({
    id: s.sizeId,
    label: s.sizeLabel,
    looseStock: s.quantity,
  }));

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Maxims Lager</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Zweites Lager mit eigenem Bestand an losen Teilen und
          Verpackungsmaterial, befüllt durch Übernahme vom Hauptlager. Von
          hier aus kann direkt verpackt und verschickt werden.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Aktueller Bestand</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-left text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-2">Grösse</th>
                  <th className="px-4 py-2">Lose Teile</th>
                </tr>
              </thead>
              <tbody>
                {maxStock.map((s) => (
                  <tr key={s.sizeId} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-medium">{s.sizeLabel}</td>
                    <td className="px-4 py-2">{s.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-left text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-2">Packgrösse</th>
                  <th className="px-4 py-2">Bestand</th>
                </tr>
              </thead>
              <tbody>
                {maxPackaging.map((p) => (
                  <tr key={p.packSize} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 font-medium">{p.packSize}er</td>
                    <td className="px-4 py-2">{p.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <h2 className="text-lg font-semibold">Vom Hauptlager übernehmen</h2>
        <MaxLagerTransferForm sizes={hauptlagerSizes} packagingStock={hauptlagerPackaging} />
      </section>

      <section className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <h2 className="text-lg font-semibold">Verkaufen / Versenden</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Für eine Bestellung, die direkt aus Maxims Lager verschickt wird.
        </p>
        <MaxLagerSaleForm sizes={maxSizesForForms} packagingStock={maxPackaging} />
      </section>

      {recentSales.length > 0 && (
        <section className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-8">
          <h2 className="text-lg font-semibold">Letzte Verkäufe</h2>
          <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-left text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="px-3 py-2">Datum</th>
                  <th className="px-3 py-2">Grösse</th>
                  <th className="px-3 py-2">Menge</th>
                  <th className="px-3 py-2">Empfänger</th>
                  <th className="px-3 py-2">Von</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2 whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                      {s.date.toLocaleDateString("de-CH")}
                    </td>
                    <td className="px-3 py-2 font-medium">{s.size.label}</td>
                    <td className="px-3 py-2">
                      {s.quantity} × {s.packSize}er
                      {s.pushedToShopify && (
                        <span className="ml-1 rounded bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-xs text-green-800 dark:text-green-300">
                          Shopify
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{s.recipient ?? "–"}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{s.createdBy ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-3 border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <h2 className="text-lg font-semibold">Bestand korrigieren</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Für Inventurkorrekturen: tatsächlich gezählten Bestand eintragen
          statt einer Zu- oder Abgangsmenge.
        </p>
        <MaxLagerAdjustForm sizes={maxSizesForForms} packagingStock={maxPackaging} />
      </section>
    </div>
  );
}
