"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EmployeeStatus } from "@/types/database";

export async function updateEmployeeProfile(
  profileId: string,
  fields: {
    full_name?: string;
    department?: string | null;
    birthdate?: string | null;
    status?: EmployeeStatus;
    vacation_days_remaining?: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: caller } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "admin") throw new Error("Admin access required");

  const { error } = await supabase.from("profiles").update(fields).eq("id", profileId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/employees/${profileId}`);
  revalidatePath("/admin");
}
