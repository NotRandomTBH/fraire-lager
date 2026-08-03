import { listPackagingStock, listSizesWithVariants } from "@/lib/inventory";
import { isShopifyConfigured } from "@/lib/shopify";
import { VerpackenForm } from "@/components/VerpackenForm";

export const dynamic = "force-dynamic";

export default async function VerpackenPage() {
  const [sizes, packagingStock] = await Promise.all([
    listSizesWithVariants(),
    listPackagingStock(),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Verpacken</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Lose Teile zu einer Packung (1er/3er/5er) zusammenstellen. Das Lager an
        losen Teilen und das passende Verpackungsmaterial werden reduziert
        {isShopifyConfigured() ? ", und wenn verknüpft, der Shopify-Bestand der Packung erhöht." : "."}
      </p>
      <VerpackenForm
        sizes={sizes}
        shopifyConfigured={isShopifyConfigured()}
        packagingStock={packagingStock}
      />
    </div>
  );
}
