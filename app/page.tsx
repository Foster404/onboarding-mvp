import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import OnboardingTimeline, { type StageWithContent } from "@/components/OnboardingTimeline";

export default async function MyOnboardingPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const supabase = await createClient();

  const { data: stages } = await supabase
    .from("stages")
    .select("*, checklist_items(*), stage_media(*)")
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "checklist_items", ascending: true });

  const { data: progress } = await supabase
    .from("employee_progress")
    .select("checklist_item_id, completed")
    .eq("profile_id", current.userId)
    .eq("completed", true);

  const completedIds = (progress ?? []).map((p) => p.checklist_item_id);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">My onboarding</h1>
      <p className="mb-6 text-sm text-slate-500">
        Your 90-day plan. Check off items as you complete them.
      </p>
      <OnboardingTimeline
        stages={(stages ?? []) as StageWithContent[]}
        completedIds={completedIds}
      />
    </div>
  );
}
