import { listSizesWithVariants } from "@/lib/inventory";
import { isShopifyConfigured } from "@/lib/shopify";
import { StockExitForm } from "@/components/StockExitForm";

export const dynamic = "force-dynamic";

export default async function AustragenPage() {
  const sizes = await listSizesWithVariants();

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Austragen</h1>
      <p className="text-sm text-neutral-600">
        Unterhosen mit oder ohne Verpackung austragen, die nicht über Shopify
        verkauft wurden (z.B. Muster, Geschenke, Ersatzlieferungen). Reduziert
        den Bestand sofort und wird im Austrags-Protokoll erfasst.
      </p>
      <StockExitForm sizes={sizes} shopifyConfigured={isShopifyConfigured()} />
    </div>
  );
}
