"use client";

import { useMemo, useState, useTransition } from "react";
import { toggleEmployeeChecklistItem, finishEmployeeOnboarding } from "@/app/actions/progress";
import type { StageProgress } from "@/lib/onboarding-progress";
import Spinner from "@/components/Spinner";

export default function EmployeeStageStatus({
  profileId,
  stageProgress,
  completedIds,
}: {
  profileId: string;
  stageProgress: StageProgress[];
  completedIds: Set<string>;
}) {
  const [pending, startTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const [optimistic, setOptimistic] = useState<Set<string>>(completedIds);

  const allItemIds = useMemo(
    () => stageProgress.flatMap(({ stage }) => stage.checklist_items.map((i) => i.id)),
    [stageProgress]
  );
  const allCompleted = allItemIds.length > 0 && allItemIds.every((id) => optimistic.has(id));

  function handleToggle(itemId: string, checked: boolean) {
    setOptimistic((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });

    startTransition(async () => {
      await toggleEmployeeChecklistItem(profileId, itemId, checked);
    });
  }

  function handleFinishOnboarding() {
    setOptimistic(new Set(allItemIds));
    setFinishing(true);
    startTransition(async () => {
      try {
        await finishEmployeeOnboarding(profileId, allItemIds);
      } finally {
        setFinishing(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Checklist status</h2>
        <button
          type="button"
          onClick={handleFinishOnboarding}
          disabled={pending || allCompleted}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {finishing && <Spinner />}
          {allCompleted ? "Onboarding complete" : finishing ? "Finishing..." : "Finish onboarding"}
        </button>
      </div>

      {stageProgress.map(({ stage }) => {
        const total = stage.checklist_items.length;
        const completed = stage.checklist_items.filter((i) => optimistic.has(i.id)).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        return (
          <div key={stage.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{stage.title}</h3>
              <span className="text-xs font-medium text-slate-500">{percent}%</span>
            </div>
            <ul className="flex flex-col gap-1">
              {stage.checklist_items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={optimistic.has(item.id)}
                    disabled={pending}
                    onChange={(e) => handleToggle(item.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  />
                  <span
                    className={
                      optimistic.has(item.id) ? "text-slate-400 line-through" : "text-slate-700"
                    }
                  >
                    {item.title}
                  </span>
                </li>
              ))}
              {total === 0 && <li className="text-sm text-slate-400">No checklist items yet.</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
