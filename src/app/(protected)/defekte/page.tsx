import { listDefectReports } from "@/lib/inventory";

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
          <div key={r.id} className="rounded-md border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{r.size.label}</span>
                <span className="text-neutral-500"> · {r.quantity} Stück defekt</span>
              </div>
              <div className="text-neutral-500">
                {r.createdAt.toLocaleString("de-CH")}
                {r.createdBy && <> · {r.createdBy}</>}
              </div>
            </div>
            {r.note && <p className="mt-1 text-sm text-neutral-600">{r.note}</p>}
            {r.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt="Defekt-Foto"
                    className="h-28 w-28 rounded object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
