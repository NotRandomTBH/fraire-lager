import { prisma } from "@/lib/prisma";
import { getBestSellers } from "@/lib/inventory";
import { isShopifyConfigured } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export default async function StatistikPage() {
  const [bestSellers, config] = await Promise.all([
    getBestSellers(30),
    prisma.shopifyConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const maxSold = Math.max(1, ...bestSellers.map((b) => b.unitsSold));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Verkaufsstatistik</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Verkaufte Packungen der letzten 30 Tage, pro Grösse und Packungsgrösse.
        {config?.lastSalesSync && (
          <> Letzter Sync: {config.lastSalesSync.toLocaleString("de-CH")}.</>
        )}
      </p>

      {!isShopifyConfigured() && (
        <p className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-sm text-neutral-500 dark:text-neutral-400">
          Shopify ist noch nicht verbunden. In den Einstellungen Zugangsdaten hinterlegen
          und synchronisieren, um Verkaufszahlen zu sehen.
        </p>
      )}

      {bestSellers.length === 0 && isShopifyConfigured() && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Noch keine Daten. Auf dem Dashboard „Mit Shopify synchronisieren“ klicken.
        </p>
      )}

      <div className="space-y-2">
        {bestSellers.map((b) => (
          <div key={`${b.sizeLabel}-${b.packSize}`} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm">
              {b.sizeLabel} – {b.packSize}er
            </span>
            <div className="h-4 flex-1 rounded bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-4 rounded bg-neutral-900 dark:bg-neutral-100"
                style={{ width: `${(b.unitsSold / maxSold) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm text-neutral-600 dark:text-neutral-400">
              {b.unitsSold}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
