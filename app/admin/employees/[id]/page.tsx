import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeStageProgress, overallPercent } from "@/lib/onboarding-progress";
import type { StageWithItems } from "@/lib/onboarding-progress";
import EmployeeEditForm from "@/components/EmployeeEditForm";
import EmployeeStageStatus from "@/components/EmployeeStageStatus";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: stages }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("stages").select("*, checklist_items(*)").order("sort_order", { ascending: true }),
    supabase
      .from("employee_progress")
      .select("checklist_item_id")
      .eq("profile_id", id)
      .eq("completed", true),
  ]);

  if (!profile) notFound();

  const completedIds = new Set((progress ?? []).map((p) => p.checklist_item_id));
  const stageProgress = computeStageProgress((stages ?? []) as StageWithItems[], completedIds);
  const percent = overallPercent(stageProgress);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{profile.full_name}</h1>
        <p className="text-sm text-slate-500">
          Started {new Date(profile.onboarding_start_date).toLocaleDateString()} · Probation ends{" "}
          {addDays(profile.onboarding_start_date, 90)} · Overall progress {percent}%
        </p>
      </div>

      <EmployeeEditForm profile={profile} />

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Checklist status</h2>
        <EmployeeStageStatus stageProgress={stageProgress} completedIds={completedIds} />
      </div>
    </div>
  );
}
