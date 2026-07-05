import type { StageProgress } from "@/lib/onboarding-progress";

export default function EmployeeStageStatus({
  stageProgress,
  completedIds,
}: {
  stageProgress: StageProgress[];
  completedIds: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {stageProgress.map(({ stage, percent }) => (
        <div key={stage.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{stage.title}</h3>
            <span className="text-xs font-medium text-slate-500">{percent}%</span>
          </div>
          <ul className="flex flex-col gap-1">
            {stage.checklist_items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={completedIds.has(item.id)} disabled className="h-4 w-4" />
                <span className={completedIds.has(item.id) ? "text-slate-400 line-through" : "text-slate-700"}>
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
