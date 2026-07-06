"use client";

import { useState, useTransition } from "react";
import { toggleEmployeeChecklistItem } from "@/app/actions/progress";
import type { StageProgress } from "@/lib/onboarding-progress";

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
  const [optimistic, setOptimistic] = useState<Set<string>>(completedIds);

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

  return (
    <div className="flex flex-col gap-4">
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
