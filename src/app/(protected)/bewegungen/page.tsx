import { listMovements } from "@/lib/inventory";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  RECEIVE: "Wareneingang",
  PACK: "Verpackt",
  ADJUST: "Korrektur",
};

export default async function BewegungenPage() {
  const movements = await listMovements(100);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Bewegungen</h1>
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Grösse</th>
              <th className="px-4 py-2">Typ</th>
              <th className="px-4 py-2">Menge</th>
              <th className="px-4 py-2">Details</th>
              <th className="px-4 py-2">Von</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {m.createdAt.toLocaleString("de-CH")}
                </td>
                <td className="px-4 py-2 font-medium">{m.size.label}</td>
                <td className="px-4 py-2">{TYPE_LABEL[m.type] ?? m.type}</td>
                <td
                  className={`px-4 py-2 ${
                    m.quantityDelta < 0 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {m.quantityDelta > 0 ? "+" : ""}
                  {m.quantityDelta}
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {m.type === "PACK" && m.packSize && m.packQuantity
                    ? `${m.packQuantity}× ${m.packSize}er Pack`
                    : m.note ?? ""}
                </td>
                <td className="px-4 py-2 text-neutral-500">{m.createdBy ?? "–"}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                  Noch keine Bewegungen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
