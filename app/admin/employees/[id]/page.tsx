import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { computeStageProgress, overallPercent } from "@/lib/onboarding-progress";
import type { StageWithItems } from "@/lib/onboarding-progress";
import { formatDate } from "@/lib/dates";
import EmployeeEditForm from "@/components/EmployeeEditForm";
import EmployeeStageStatus from "@/components/EmployeeStageStatus";
import BackButton from "@/components/BackButton";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const current = await getCurrentUser();
  if (!current) redirect("/login");

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
      <div className="flex items-start gap-2">
        <BackButton />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{profile.full_name}</h1>
          <p className="text-sm text-slate-500">
            Started: {formatDate(profile.onboarding_start_date)} · Probation ends:{" "}
            {formatDate(profile.probation_end_date)} · Overall progress: {percent}%
          </p>
        </div>
      </div>

      <EmployeeEditForm profile={profile} currentUserId={current.userId} />

      <EmployeeStageStatus
        profileId={profile.id}
        stageProgress={stageProgress}
        completedIds={completedIds}
      />
    </div>
  );
}
