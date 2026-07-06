import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChecklistItem, Database, Stage } from "@/types/database";

export type StageWithItems = Stage & { checklist_items: ChecklistItem[] };

// Supabase caps unpaginated selects at 1000 rows, which silently truncates
// this table once there are enough employees/checklist items - page through
// it explicitly so every completed item is counted.
export async function fetchAllCompletedProgress(
  supabase: SupabaseClient<Database>
): Promise<{ profile_id: string; checklist_item_id: string }[]> {
  const pageSize = 1000;
  const rows: { profile_id: string; checklist_item_id: string }[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("employee_progress")
      .select("profile_id, checklist_item_id")
      .eq("completed", true)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

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
