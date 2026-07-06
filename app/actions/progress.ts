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

export async function toggleEmployeeChecklistItem(
  profileId: string,
  checklistItemId: string,
  completed: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: caller } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "admin") throw new Error("Admin access required");

  const { error } = await supabase.from("employee_progress").upsert(
    {
      profile_id: profileId,
      checklist_item_id: checklistItemId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "profile_id,checklist_item_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/employees/${profileId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/employees");
}

export async function finishEmployeeOnboarding(profileId: string, checklistItemIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: caller } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "admin") throw new Error("Admin access required");

  if (checklistItemIds.length === 0) return;

  const completedAt = new Date().toISOString();
  const { error } = await supabase.from("employee_progress").upsert(
    checklistItemIds.map((checklistItemId) => ({
      profile_id: profileId,
      checklist_item_id: checklistItemId,
      completed: true,
      completed_at: completedAt,
    })),
    { onConflict: "profile_id,checklist_item_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/employees/${profileId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/employees");
}
