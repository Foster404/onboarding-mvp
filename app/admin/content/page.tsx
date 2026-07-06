import { createClient } from "@/lib/supabase/server";
import StageContentEditor, { type StageWithContent } from "@/components/StageContentEditor";

export default async function AdminContentPage() {
  const supabase = await createClient();

  const { data: stages } = await supabase
    .from("stages")
    .select("*, checklist_items(*), stage_media(*)")
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "checklist_items", ascending: true });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Onboarding content</h1>
      <p className="mb-6 text-sm text-slate-500">
        Changes here apply immediately to every employee who hasn&apos;t finished the stage yet
      </p>

      <div className="flex flex-col gap-6">
        {((stages ?? []) as StageWithContent[]).map((stage) => (
          <StageContentEditor key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  );
}
