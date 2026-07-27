type Point = { date: Date; units: number };

export function DailyUnitsChart({ series }: { series: Point[] }) {
  const max = Math.max(1, ...series.map((p) => p.units));
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <div>
      <div className="flex h-32 items-end gap-[2px]">
        {series.map((p, i) => (
          <div
            key={i}
            title={`${p.date.toLocaleDateString("de-CH")}: ${p.units} Stück`}
            className="flex-1 rounded-t bg-neutral-800"
            style={{ height: `${Math.max(2, (p.units / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-neutral-400">
        {series.map((p, i) => (
          <div key={i} className="flex-1 text-center">
            {i % labelEvery === 0 ? p.date.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" }) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
