import { listDefectReports } from "@/lib/inventory";
import { DefectReportsList } from "@/components/DefectReportsList";

export const dynamic = "force-dynamic";

export default async function DefektePage() {
  const reports = await listDefectReports(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Defekte</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Protokoll defekter Ware aus dem Wareneingang. Zählt nicht zum
          verkaufbaren Lagerbestand. Einträge auswählen und als PDF (ohne
          Fotos) exportieren, z.B. für den Produzenten.
        </p>
      </div>

      <DefectReportsList reports={reports} />
    </div>
  );
}
