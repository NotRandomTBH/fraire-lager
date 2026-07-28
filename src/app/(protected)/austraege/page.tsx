import { listStockExits } from "@/lib/inventory";
import { StockExitsList } from "@/components/StockExitsList";

export const dynamic = "force-dynamic";

export default async function AustraegePage() {
  const exits = await listStockExits(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Austräge</h1>
        <p className="text-sm text-neutral-600">
          Protokoll aller Warenausgänge ausserhalb des normalen Shopify-Verkaufs.
          Einträge auswählen und als PDF exportieren.
        </p>
      </div>
      <StockExitsList exits={exits} />
    </div>
  );
}
