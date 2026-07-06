type Segment = { label: string; value: number; color: string };

export default function PieChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let acc = 0;
  const stops = segments
    .map((s) => {
      const start = (acc / (total || 1)) * 360;
      acc += s.value;
      const end = (acc / (total || 1)) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-8">
      <div
        className="h-36 w-36 shrink-0 rounded-full"
        style={{ background: total === 0 ? "#e2e8f0" : `conic-gradient(${stops})` }}
      />
      <ul className="flex flex-col gap-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-medium text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
