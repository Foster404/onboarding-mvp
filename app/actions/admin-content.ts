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
  const { data: last } = await supabase
    .from("stage_media")
    .select("sort_order")
    .eq("stage_id", stageId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (last?.sort_order ?? 0) + 1;
  const { error } = await supabase
    .from("stage_media")
    .insert({ stage_id: stageId, type, title, url, sort_order: nextSortOrder });
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

// `orderedIds` is the full media list for the stage in its new order; each
// row's sort_order is rewritten to its 1-based position.
export async function reorderStageMedia(stageId: string, orderedIds: string[]) {
  const supabase = await assertAdmin();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("stage_media").update({ sort_order: index + 1 }).eq("id", id).eq("stage_id", stageId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
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
