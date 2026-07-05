import type { ChecklistItem, Stage } from "@/types/database";

export type StageWithItems = Stage & { checklist_items: ChecklistItem[] };

export interface StageProgress {
  stage: StageWithItems;
  total: number;
  completed: number;
  percent: number;
}

export function computeStageProgress(
  stages: StageWithItems[],
  completedItemIds: Set<string>
): StageProgress[] {
  return stages.map((stage) => {
    const total = stage.checklist_items.length;
    const completed = stage.checklist_items.filter((i) => completedItemIds.has(i.id)).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { stage, total, completed, percent };
  });
}

export function overallPercent(stageProgress: StageProgress[]): number {
  const total = stageProgress.reduce((sum, s) => sum + s.total, 0);
  const completed = stageProgress.reduce((sum, s) => sum + s.completed, 0);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

// The stage the employee is currently working through: the first one that
// isn't 100% complete, or the last stage if everything is done.
export function currentStage(stageProgress: StageProgress[]): StageProgress | undefined {
  return stageProgress.find((s) => s.percent < 100) ?? stageProgress[stageProgress.length - 1];
}
