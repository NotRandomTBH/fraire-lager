import { prisma } from "@/lib/prisma";
import { listDefectReasons } from "@/lib/inventory";
import { WareneingangForm } from "@/components/WareneingangForm";
import { AdjustStockForm } from "@/components/AdjustStockForm";

export const dynamic = "force-dynamic";

export default async function WareneingangUnterhosenPage() {
  const [sizes, defectReasons] = await Promise.all([
    prisma.size.findMany({ orderBy: { order: "asc" } }),
    listDefectReasons(),
  ]);

  return (
    <div className="max-w-lg space-y-10">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Wareneingang Unterhosen</h1>
        <p className="text-sm text-neutral-600">
          Neue lose Unterhosen (unverpackt) einbuchen, z.B. nach Lieferung vom Hersteller.
        </p>
        <WareneingangForm sizes={sizes} defectReasons={defectReasons} />
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
