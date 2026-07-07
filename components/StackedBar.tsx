export type StackedBarItem = { label: string; value: number; color: string };

// A single bar split into proportional colored segments - a different shape
// than BarList/PieChart, good for showing how one total breaks down by category.
export default function StackedBar({ items }: { items: StackedBarItem[] }) {
  const total = items.reduce((sum, i) => sum + i.value, 0);

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map(
          (item) =>
            item.value > 0 && (
              <div
                key={item.label}
                title={`${item.label}: ${item.value}`}
                style={{ width: `${(item.value / (total || 1)) * 100}%`, backgroundColor: item.color }}
              />
            )
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="truncate text-slate-600">{item.label}</span>
            <span className="ml-auto shrink-0 font-medium text-slate-900">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
