import { getCartonStock, listPackagingStock, listSizesWithVariants } from "@/lib/inventory";
import { isShopifyConfigured } from "@/lib/shopify";
import { StockExitForm } from "@/components/StockExitForm";

export const dynamic = "force-dynamic";

export default async function WarenausgangPage() {
  const [sizes, packagingStock, cartonStock] = await Promise.all([
    listSizesWithVariants(),
    listPackagingStock(),
    getCartonStock(),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Warenausgang</h1>
        <p className="text-sm text-neutral-600">
          Manuelle Austräge ausserhalb des normalen Shopify-Verkaufs – für
          Unterhosen (lose oder verpackt), Verpackungsmaterial oder
          Versandkartons, z.B. Muster, Geschenke, Ersatzlieferungen. Mit
          Begründung, Empfänger und Datum. Das vollständige Protokoll findet
          sich unter Bewegungen.
        </p>
      </div>
      <StockExitForm
        sizes={sizes}
        shopifyConfigured={isShopifyConfigured()}
        packagingStock={packagingStock}
        cartonStock={cartonStock}
      />
    </div>
  );
}
