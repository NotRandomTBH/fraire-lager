import { getCartonStock, listDefectReasons, listPackagingStock } from "@/lib/inventory";
import { PackagingStockForm } from "@/components/PackagingStockForm";
import { CartonStockForm } from "@/components/CartonStockForm";
import { PackagingDefectForm } from "@/components/PackagingDefectForm";

export const dynamic = "force-dynamic";

export default async function WareneingangVerpackungPage() {
  const [packagingStock, cartonStock, defectReasons] = await Promise.all([
    listPackagingStock(),
    getCartonStock(),
    listDefectReasons(),
  ]);

  return (
    <div className="max-w-lg space-y-10">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Wareneingang Verpackung</h1>
        <p className="text-sm text-neutral-600">
          1er/3er/5er-Verpackungen sind grössenunabhängig – derselbe Bestand
          wird beim Verpacken egal welcher Unterhosen-Grösse automatisch
          reduziert.
        </p>
        <PackagingStockForm stock={packagingStock} />
      </div>

      <div className="space-y-6 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-semibold">Versandkartons</h2>
        <p className="text-sm text-neutral-600">
          Kartons für den Versand fertiger Bestellungen, unabhängig von
          Grösse oder Verpackungsart.
        </p>
        <CartonStockForm quantity={cartonStock} />
      </div>

      <div className="space-y-6 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-semibold">Defekt erfassen</h2>
        <p className="text-sm text-neutral-600">
          Defektes Verpackungsmaterial oder beschädigte Versandkartons
          dokumentieren (zählt nicht zum verkaufbaren Bestand).
        </p>
        <PackagingDefectForm packagingStock={packagingStock} defectReasons={defectReasons} />
      </div>
    </div>
  );
}
