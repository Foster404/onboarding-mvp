export type VerticalBarItem = { label: string; value: number; color?: string };

// Thick vertical bars, sized relative to the largest value in the set.
export default function VerticalBarChart({ items }: { items: VerticalBarItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="flex h-48 items-end gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="relative flex w-full items-center justify-center rounded-t-md"
              style={{
                height: `${(item.value / max) * 100}%`,
                minHeight: item.value > 0 ? "20px" : 0,
                backgroundColor: item.color ?? "#4f46e5",
              }}
            >
              <span className="text-sm font-medium text-white">{item.value}</span>
            </div>
          </div>
          <span className="text-center text-xs text-slate-500" title={item.label}>
            {item.label}
          </span>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
    </div>
  );
}
