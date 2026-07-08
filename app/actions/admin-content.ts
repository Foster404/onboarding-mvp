"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MediaType } from "@/types/database";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: caller } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "admin") throw new Error("Admin access required");

  return supabase;
}

export async function updateStageTitle(stageId: string, title: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("stages").update({ title }).eq("id", stageId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function addChecklistItem(stageId: string, title: string, sortOrder: number) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("checklist_items")
    .insert({ stage_id: stageId, title, sort_order: sortOrder });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function updateChecklistItem(itemId: string, title: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("checklist_items").update({ title }).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function deleteChecklistItem(itemId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function addStageMedia(stageId: string, type: MediaType, title: string, url: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("stage_media").insert({ stage_id: stageId, type, title, url });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function updateStageMediaTitle(mediaId: string, title: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("stage_media").update({ title }).eq("id", mediaId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function deleteStageMedia(mediaId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("stage_media").delete().eq("id", mediaId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/content");
  revalidatePath("/");
}
