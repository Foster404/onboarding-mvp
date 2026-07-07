export type BarListItem = {
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
};

// Horizontal bar list - each row's bar width is relative to the largest
// value in the set, so the biggest bucket always reads as "full". The value
// and sublabel each get their own fixed-width, right-aligned column so a
// short number (e.g. "9") still lines up with longer ones ("20") and their
// sublabels line up independently of the value's digit count.
export default function BarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const hasSublabels = items.some((i) => i.sublabel);

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-36 shrink-0 truncate text-slate-600" title={item.label}>
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? "#4f46e5",
              }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-medium text-slate-900">{item.value}</span>
          {hasSublabels && (
            <span className="w-24 shrink-0 whitespace-nowrap text-right text-slate-400">
              {item.sublabel ?? ""}
            </span>
          )}
        </li>
      ))}
      {items.length === 0 && <li className="text-sm text-slate-400">No data yet.</li>}
    </ul>
  );
}
