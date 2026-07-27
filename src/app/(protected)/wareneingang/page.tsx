import { prisma } from "@/lib/prisma";
import { listDefectReasons, listPackagingStock } from "@/lib/inventory";
import { WareneingangForm } from "@/components/WareneingangForm";
import { AdjustStockForm } from "@/components/AdjustStockForm";
import { PackagingStockForm } from "@/components/PackagingStockForm";

export const dynamic = "force-dynamic";

export default async function WareneingangPage() {
  const [sizes, defectReasons, packagingStock] = await Promise.all([
    prisma.size.findMany({ orderBy: { order: "asc" } }),
    listDefectReasons(),
    listPackagingStock(),
  ]);

  return (
    <div className="max-w-lg space-y-10">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Wareneingang</h1>
        <p className="text-sm text-neutral-600">
          Neue lose Unterhosen (unverpackt) einbuchen, z.B. nach Lieferung vom Hersteller.
        </p>
        <WareneingangForm sizes={sizes} defectReasons={defectReasons} />
      </div>

      <div className="space-y-6 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-semibold">Verpackungsmaterial nachfüllen</h2>
        <p className="text-sm text-neutral-600">
          1er/3er/5er-Verpackungen sind grössenunabhängig – derselbe Bestand
          wird beim Verpacken egal welcher Unterhosen-Grösse automatisch
          reduziert.
        </p>
        <PackagingStockForm stock={packagingStock} />
      </div>

      <div className="space-y-6 border-t border-neutral-200 pt-8">
        <h2 className="text-lg font-semibold">Bestand korrigieren</h2>
        <p className="text-sm text-neutral-600">
          Für Inventurkorrekturen: tatsächlich gezählten Bestand eintragen statt einer
          Zu- oder Abgangsmenge.
        </p>
        <AdjustStockForm sizes={sizes} />
      </div>
    </div>
  );
}
