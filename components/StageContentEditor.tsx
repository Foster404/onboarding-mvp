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
import Spinner from "@/components/Spinner";

export type StageWithContent = Stage & { checklist_items: ChecklistItem[]; stage_media: StageMedia[] };

// The admin only ever picks "Link" or "File" - whether it plays back as a
// video or opens as a plain link is inferred from the URL / uploaded file's
// mime type, rather than asking the admin to classify it themselves.
function inferMediaType(url: string, mime?: string): MediaType {
  if (mime) return mime.startsWith("video/") ? "video" : "presentation";
  if (/youtube\.com|youtu\.be/i.test(url)) return "video";
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url)) return "video";
  return "presentation";
}

// Uploaded files live in our own Supabase Storage bucket, so it's safe to
// force a download for them; pasted links (e.g. YouTube) should just open.
function isUploadedFileUrl(url: string) {
  return url.includes("/storage/v1/object/public/media/");
}

export default function StageContentEditor({ stage }: { stage: StageWithContent }) {
  const router = useRouter();
  const [title, setTitle] = useState(stage.title);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newMediaTitle, setNewMediaTitle] = useState("");
  const [sourceMode, setSourceMode] = useState<"link" | "file">("link");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [uploadedMime, setUploadedMime] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function selectSourceMode(mode: "link" | "file") {
    setSourceMode(mode);
    setNewMediaUrl("");
    setUploadedMime(undefined);
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusyKey(key);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusyKey(null);
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
    setUploadedMime(file.type);
    if (!newMediaTitle) setNewMediaTitle(file.name);
  }

  const busy = busyKey !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-base font-semibold focus:border-slate-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || title === stage.title}
          onClick={() => run("save-title", () => updateStageTitle(stage.id, title))}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busyKey === "save-title" && <Spinner className="h-3.5 w-3.5" />}
          Save title
        </button>
      </div>

      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-slate-700">Checklist items</h4>
        <ul className="mb-2 flex flex-col gap-2">
          {stage.checklist_items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} busyKey={busyKey} run={run} />
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
              run("add-item", async () => {
                await addChecklistItem(stage.id, newItemTitle.trim(), stage.checklist_items.length + 1);
                setNewItemTitle("");
              })
            }
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busyKey === "add-item" && <Spinner className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h4 className="mb-2 text-sm font-medium text-slate-700">Videos &amp; presentations</h4>
        <ul className="mb-3 flex flex-col gap-2">
          {stage.stage_media.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer"
                title={m.url}
                className="truncate text-indigo-600 hover:underline"
                {...(isUploadedFileUrl(m.url) ? { download: true } : {})}
              >
                {m.title}
              </a>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-400">{m.type === "video" ? "Video" : "File"}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(`remove-media-${m.id}`, () => deleteStageMedia(m.id))}
                  className="flex items-center gap-1.5 text-red-600 hover:underline disabled:opacity-50"
                >
                  {busyKey === `remove-media-${m.id}` && <Spinner className="h-3.5 w-3.5" />}
                  Remove
                </button>
              </div>
            </li>
          ))}
          {stage.stage_media.length === 0 && (
            <li className="text-sm text-slate-400">No media yet.</li>
          )}
        </ul>

        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
          <input
            value={newMediaTitle}
            onChange={(e) => setNewMediaTitle(e.target.value)}
            placeholder="Title*"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => selectSourceMode("link")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sourceMode === "link"
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => selectSourceMode("file")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sourceMode === "file"
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              File
            </button>
          </div>

          {sourceMode === "link" ? (
            <input
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              placeholder="e.g. https://youtube.com/watch?v=... or another link"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          ) : (
            <div className="flex items-center gap-2">
              <input type="file" onChange={handleUploadFile} disabled={uploading} className="text-xs" />
              {uploading && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Spinner className="h-3 w-3" /> uploading...
                </span>
              )}
              {!uploading && newMediaUrl && (
                <span className="text-xs text-emerald-600">Uploaded ✓</span>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy || !newMediaTitle.trim() || !newMediaUrl.trim()}
              onClick={() =>
                run("add-media", async () => {
                  const type = inferMediaType(newMediaUrl.trim(), uploadedMime);
                  await addStageMedia(stage.id, type, newMediaTitle.trim(), newMediaUrl.trim());
                  setNewMediaTitle("");
                  setNewMediaUrl("");
                  setUploadedMime(undefined);
                })
              }
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {busyKey === "add-media" && <Spinner className="h-3.5 w-3.5" />}
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
  busyKey,
  run,
}: {
  item: ChecklistItem;
  busyKey: string | null;
  run: (key: string, fn: () => Promise<void>) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const busy = busyKey !== null;
  const saveKey = `save-item-${item.id}`;
  const deleteKey = `delete-item-${item.id}`;

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
        onClick={() => run(saveKey, () => updateChecklistItem(item.id, title))}
        className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busyKey === saveKey && <Spinner className="h-3 w-3" />}
        Save
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(deleteKey, () => deleteChecklistItem(item.id))}
        className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busyKey === deleteKey && <Spinner className="h-3 w-3" />}
        Delete
      </button>
    </li>
  );
}
