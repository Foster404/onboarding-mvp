"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleChecklistItem(checklistItemId: string, completed: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("employee_progress").upsert(
    {
      profile_id: user.id,
      checklist_item_id: checklistItemId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "profile_id,checklist_item_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/");
}
