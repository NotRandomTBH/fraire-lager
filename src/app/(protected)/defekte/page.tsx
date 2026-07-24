import { listDefectReports } from "@/lib/inventory";
import { DefectReportCard } from "@/components/DefectReportCard";

export const dynamic = "force-dynamic";

export default async function DefektePage() {
  const reports = await listDefectReports(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Defekte</h1>
        <p className="text-sm text-neutral-600">
          Protokoll defekter Ware aus dem Wareneingang. Zählt nicht zum
          verkaufbaren Lagerbestand.
        </p>
      </div>

      {reports.length === 0 && (
        <p className="text-sm text-neutral-400">Noch keine Defekte erfasst.</p>
      )}

      <div className="space-y-4">
        {reports.map((r) => (
          <DefectReportCard key={r.id} report={r} />
        ))}
      </div>
    </div>
  );
}
