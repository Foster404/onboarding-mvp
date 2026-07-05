"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addChecklistItem,
  addStageMedia,
  deleteChecklistItem,
  deleteStageMedia,
  updateChecklistItem,
  updateStageTitle,
} from "@/app/actions/admin-content";
import type { ChecklistItem, MediaType, Stage, StageMedia } from "@/types/database";

export type StageWithContent = Stage & { checklist_items: ChecklistItem[]; stage_media: StageMedia[] };

export default function StageContentEditor({ stage }: { stage: StageWithContent }) {
  const router = useRouter();
  const [title, setTitle] = useState(stage.title);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newMediaTitle, setNewMediaTitle] = useState("");
  const [newMediaType, setNewMediaType] = useState<MediaType>("video");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const path = `${stage.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    setUploading(false);

    if (error) {
      alert(error.message);
      return;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setNewMediaUrl(data.publicUrl);
    if (!newMediaTitle) setNewMediaTitle(file.name);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-base font-semibold focus:border-slate-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || title === stage.title}
          onClick={() => run(() => updateStageTitle(stage.id, title))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Save title
        </button>
      </div>

      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-slate-700">Checklist items</h4>
        <ul className="mb-2 flex flex-col gap-2">
          {stage.checklist_items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} busy={busy} run={run} />
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="New checklist item..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !newItemTitle.trim()}
            onClick={() =>
              run(async () => {
                await addChecklistItem(stage.id, newItemTitle.trim(), stage.checklist_items.length + 1);
                setNewItemTitle("");
              })
            }
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h4 className="mb-2 text-sm font-medium text-slate-700">Videos &amp; presentations</h4>
        <ul className="mb-3 flex flex-col gap-2">
          {stage.stage_media.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <span className="truncate text-slate-700">
                [{m.type}] {m.title}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => deleteStageMedia(m.id))}
                className="text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
          {stage.stage_media.length === 0 && (
            <li className="text-sm text-slate-400">No media yet.</li>
          )}
        </ul>

        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
          <div className="flex gap-2">
            <select
              value={newMediaType}
              onChange={(e) => setNewMediaType(e.target.value as MediaType)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="video">Video</option>
              <option value="presentation">Presentation</option>
            </select>
            <input
              value={newMediaTitle}
              onChange={(e) => setNewMediaTitle(e.target.value)}
              placeholder="Title"
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <input
            value={newMediaUrl}
            onChange={(e) => setNewMediaUrl(e.target.value)}
            placeholder="URL (YouTube link, or upload a file below)"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-500">
              <input type="file" onChange={handleUploadFile} disabled={uploading} className="text-xs" />
              {uploading && " uploading..."}
            </label>
            <button
              type="button"
              disabled={busy || !newMediaTitle.trim() || !newMediaUrl.trim()}
              onClick={() =>
                run(async () => {
                  await addStageMedia(stage.id, newMediaType, newMediaTitle.trim(), newMediaUrl.trim());
                  setNewMediaTitle("");
                  setNewMediaUrl("");
                })
              }
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Add media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistItemRow({
  item,
  busy,
  run,
}: {
  item: ChecklistItem;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);

  return (
    <li className="flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={busy || title === item.title}
        onClick={() => run(() => updateChecklistItem(item.id, title))}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Save
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => deleteChecklistItem(item.id))}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}
