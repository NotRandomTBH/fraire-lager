import type { ReorderStatus } from "@/lib/reorder";

const STYLES: Record<ReorderStatus, { label: string; className: string }> = {
  ROT: { label: "Rot – jetzt bestellen", className: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300" },
  GELB: { label: "Gelb – bald bestellen", className: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300" },
  GRUEN: { label: "Grün", className: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300" },
  GRAU: { label: "Keine Daten", className: "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300" },
};

export function StatusBadge({ status, compact = false }: { status: ReorderStatus; compact?: boolean }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
      <span
        className={`h-2 w-2 rounded-full ${
          status === "ROT"
            ? "bg-red-500"
            : status === "GELB"
              ? "bg-amber-500"
              : status === "GRUEN"
                ? "bg-green-500"
                : "bg-neutral-400"
        }`}
      />
      {compact ? status : s.label}
    </span>
  );
}
