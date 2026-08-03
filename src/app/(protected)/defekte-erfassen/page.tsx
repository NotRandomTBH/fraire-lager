import { prisma } from "@/lib/prisma";
import { listDefectReasons, listPackagingStock } from "@/lib/inventory";
import { DefectCaptureForm } from "@/components/DefectCaptureForm";

export const dynamic = "force-dynamic";

export default async function DefekteErfassenPage() {
  const [sizes, packagingStock, defectReasons] = await Promise.all([
    prisma.size.findMany({ orderBy: { order: "asc" } }),
    listPackagingStock(),
    listDefectReasons(),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Defekte erfassen</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Defekte Unterhosen, Verpackungsmaterial oder beschädigte
          Versandkartons dokumentieren (zählt nicht zum verkaufbaren
          Bestand). Das vollständige Protokoll findet sich unter Defekte.
        </p>
      </div>
      <DefectCaptureForm sizes={sizes} packagingStock={packagingStock} defectReasons={defectReasons} />
    </div>
  );
}
