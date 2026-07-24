import Link from "next/link";
import { getBestSellers, listSizesWithVariants } from "@/lib/inventory";
import { isShopifyConfigured, syncInventoryLevelsIfStale } from "@/lib/shopify";
import { SyncPanel } from "@/components/SyncPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await syncInventoryLevelsIfStale();

  const [sizes, bestSellers] = await Promise.all([
    listSizesWithVariants(),
    getBestSellers(30),
  ]);

  const alerts = sizes.filter((s) => s.looseStock < s.reorderThreshold);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <SyncPanel configured={isShopifyConfigured()} />
      </div>

      {alerts.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-900">Nachbestellen</h2>
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
        <h2 className="mb-3 font-medium">Lagerbestand (lose Einzelteile)</h2>
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-2">Grösse</th>
                <th className="px-4 py-2">Lose Teile</th>
                <th className="px-4 py-2">Schwelle</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Shopify-Packungen</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => {
                const low = s.looseStock < s.reorderThreshold;
                return (
                  <tr key={s.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 font-medium">{s.label}</td>
                    <td className="px-4 py-2">{s.looseStock}</td>
                    <td className="px-4 py-2 text-neutral-500">{s.reorderThreshold}</td>
                    <td className="px-4 py-2">
                      {low ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          niedrig
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                          ok
                        </span>
                      )}
                    </td>
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
      </div>
    </div>
  );
}
