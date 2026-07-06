import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { computeStageProgress, overallPercent } from "@/lib/onboarding-progress";
import type { StageWithItems } from "@/lib/onboarding-progress";
import ProfileEditor from "@/components/ProfileEditor";

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const supabase = await createClient();

  const [{ data: stages }, { data: progress }] = await Promise.all([
    supabase.from("stages").select("*, checklist_items(*)").order("sort_order", { ascending: true }),
    supabase
      .from("employee_progress")
      .select("checklist_item_id")
      .eq("profile_id", current.userId)
      .eq("completed", true),
  ]);

  const completedIds = new Set((progress ?? []).map((p) => p.checklist_item_id));
  const stageProgress = computeStageProgress((stages ?? []) as StageWithItems[], completedIds);
  const percent = overallPercent(stageProgress);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">My profile</h1>
      <p className="mb-6 text-sm text-slate-500">
        Update your photo and birth date. Other fields are managed by HR.
      </p>
      <ProfileEditor profile={current.profile} userId={current.userId} overallProgress={percent} />
    </div>
  );
}
