import { listAllMovements } from "@/lib/inventory";
import { BewegungenList } from "@/components/BewegungenList";

export const dynamic = "force-dynamic";

export default async function BewegungenPage() {
  const movements = await listAllMovements(150);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bewegungen</h1>
        <p className="text-sm text-neutral-600">
          Alle Bestandsbewegungen (Unterhosen, Verpackungsmaterial, Kartons) und
          Austräge an einem Ort. Austräge auswählen und als PDF exportieren.
        </p>
      </div>
      <BewegungenList movements={movements} />
    </div>
  );
}
