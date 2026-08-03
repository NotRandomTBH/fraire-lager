import { prisma } from "@/lib/prisma";
import { WareneingangForm } from "@/components/WareneingangForm";
import { AdjustStockForm } from "@/components/AdjustStockForm";

export const dynamic = "force-dynamic";

export default async function WareneingangUnterhosenPage() {
  const sizes = await prisma.size.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="max-w-lg space-y-10">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Wareneingang Unterhosen</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Neue lose Unterhosen (unverpackt) einbuchen, z.B. nach Lieferung vom Hersteller.
        </p>
        <WareneingangForm sizes={sizes} />
      </div>

      <div className="space-y-6 border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <h2 className="text-lg font-semibold">Bestand korrigieren</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Für Inventurkorrekturen: tatsächlich gezählten Bestand eintragen statt einer
          Zu- oder Abgangsmenge.
        </p>
        <AdjustStockForm sizes={sizes} />
      </div>
    </div>
  );
}
