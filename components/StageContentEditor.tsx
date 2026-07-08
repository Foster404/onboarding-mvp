"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addChecklistItem,
  addStageMedia,
  deleteChecklistItem,
  deleteStageMedia,
  updateChecklistItem,
  updateStageMediaTitle,
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

// Supabase Storage rejects object keys with spaces or characters like
// [ ] outside a small safe set, so strip anything that isn't - the
// original file name is still kept as the media's title.
function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function deriveFallbackTitle(url: string) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : parsed.hostname;
  } catch {
    return url;
  }
}

async function fetchYoutubeTitle(url: string): Promise<string | undefined> {
  if (!/youtube\.com|youtu\.be/i.test(url)) return undefined;
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return undefined;
    const data = await res.json();
    return typeof data?.title === "string" ? data.title : undefined;
  } catch {
    return undefined;
  }
}

type PendingFile = {
  id: string;
  file: File;
  title: string;
  url?: string;
  uploading: boolean;
  error?: string;
};

export default function StageContentEditor({ stage }: { stage: StageWithContent }) {
  const router = useRouter();
  const [title, setTitle] = useState(stage.title);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newMediaTitle, setNewMediaTitle] = useState("");
  const [sourceMode, setSourceMode] = useState<"link" | "file">("link");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [duplicateFileNames, setDuplicateFileNames] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectSourceMode(mode: "link" | "file") {
    setSourceMode(mode);
    setNewMediaTitle("");
    setNewMediaUrl("");
    setPendingFiles([]);
    setDuplicateFileNames([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startRename(m: StageMedia) {
    setRenamingId(m.id);
    setRenameValue(m.title);
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

  async function handleUrlBlur() {
    const url = newMediaUrl.trim();
    if (!url || newMediaTitle.trim()) return;
    const title = await fetchYoutubeTitle(url);
    if (title) setNewMediaTitle(title);
  }

  // Files can be picked several at a time; each uploads independently and
  // shows up as its own editable row before the admin confirms "Add media".
  async function handleChooseFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const existingFileNames = new Set(
      stage.stage_media.filter((m) => isUploadedFileUrl(m.url)).map((m) => m.title)
    );
    const pendingNames = new Set(pendingFiles.map((pf) => pf.file.name));
    const files = picked.filter((f) => !existingFileNames.has(f.name) && !pendingNames.has(f.name));
    const duplicates = picked.filter((f) => existingFileNames.has(f.name) || pendingNames.has(f.name));
    setDuplicateFileNames(duplicates.map((f) => f.name));
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    const entries: PendingFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      title: file.name,
      uploading: true,
    }));
    setPendingFiles((prev) => [...prev, ...entries]);

    const supabase = createClient();
    await Promise.all(
      entries.map(async (entry) => {
        const path = `${stage.id}/${entry.id}-${sanitizeFileName(entry.file.name)}`;
        const { error } = await supabase.storage.from("media").upload(path, entry.file, { upsert: true });
        if (error) {
          setPendingFiles((prev) =>
            prev.map((pf) => (pf.id === entry.id ? { ...pf, uploading: false, error: error.message } : pf))
          );
          return;
        }
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        setPendingFiles((prev) =>
          prev.map((pf) => (pf.id === entry.id ? { ...pf, uploading: false, url: data.publicUrl } : pf))
        );
      })
    );
  }

  function updatePendingTitle(id: string, value: string) {
    setPendingFiles((prev) => prev.map((pf) => (pf.id === id ? { ...pf, title: value } : pf)));
  }

  function removePendingFile(id: string) {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id));
  }

  const busy = busyKey !== null;
  const pendingReady = pendingFiles.filter((pf) => pf.url && !pf.uploading);
  const normalizedNewUrl = newMediaUrl.trim();
  const isDuplicateLink =
    normalizedNewUrl.length > 0 && stage.stage_media.some((m) => m.url === normalizedNewUrl);
  const canAddMedia =
    sourceMode === "link"
      ? normalizedNewUrl.length > 0 && !isDuplicateLink
      : pendingReady.length > 0;

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
        <h4 className="mb-2 text-sm font-medium text-slate-700">Videos &amp; files</h4>
        <ul className="mb-3 flex flex-col gap-2">
          {stage.stage_media.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs text-slate-400">
                  {isUploadedFileUrl(m.url) ? (m.type === "video" ? "Video" : "File") : "Link"}
                </span>
                {renamingId === m.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                ) : (
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
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {renamingId === m.id ? (
                  <>
                    <button
                      type="button"
                      disabled={busy || !renameValue.trim()}
                      onClick={() =>
                        run(`rename-media-${m.id}`, async () => {
                          await updateStageMediaTitle(m.id, renameValue.trim());
                          setRenamingId(null);
                        })
                      }
                      className="flex items-center gap-1.5 text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      {busyKey === `rename-media-${m.id}` && <Spinner className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRenamingId(null)}
                      className="text-slate-500 hover:underline disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startRename(m)}
                      className="text-slate-600 hover:underline disabled:opacity-50"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(`remove-media-${m.id}`, () => deleteStageMedia(m.id))}
                      className="flex items-center gap-1.5 text-red-600 hover:underline disabled:opacity-50"
                    >
                      {busyKey === `remove-media-${m.id}` && <Spinner className="h-3.5 w-3.5" />}
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
          {stage.stage_media.length === 0 && (
            <li className="text-sm text-slate-400">No media yet.</li>
          )}
        </ul>

        <div className="flex flex-col gap-2 rounded-md bg-slate-50 p-3">
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
            <>
              <input
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                onBlur={handleUrlBlur}
                placeholder="e.g. https://youtube.com/watch?v=... or another link"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
              {isDuplicateLink && (
                <p className="text-xs text-red-600">This link has already been added.</p>
              )}
              <input
                value={newMediaTitle}
                onChange={(e) => setNewMediaTitle(e.target.value)}
                placeholder="Title (auto-filled once you add the link - editable)"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleChooseFiles}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                >
                  Choose file(s)
                </button>
                <span className="text-xs text-slate-400">You can select more than one</span>
              </div>

              {duplicateFileNames.length > 0 && (
                <p className="text-xs text-red-600">
                  Already added, skipped: {duplicateFileNames.join(", ")}
                </p>
              )}

              {pendingFiles.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {pendingFiles.map((pf) => (
                    <li key={pf.id} className="flex items-center gap-2">
                      <input
                        value={pf.title}
                        onChange={(e) => updatePendingTitle(pf.id, e.target.value)}
                        placeholder="Title (editable)"
                        className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      />
                      {pf.uploading && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Spinner className="h-3 w-3" /> uploading...
                        </span>
                      )}
                      {pf.error && <span className="text-xs text-red-600">{pf.error}</span>}
                      <button
                        type="button"
                        onClick={() => removePendingFile(pf.id)}
                        className="shrink-0 text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy || !canAddMedia}
              onClick={() =>
                run("add-media", async () => {
                  if (sourceMode === "link") {
                    const url = newMediaUrl.trim();
                    const mediaTitle = newMediaTitle.trim() || deriveFallbackTitle(url);
                    await addStageMedia(stage.id, inferMediaType(url), mediaTitle, url);
                    setNewMediaTitle("");
                    setNewMediaUrl("");
                  } else {
                    for (const pf of pendingReady) {
                      await addStageMedia(
                        stage.id,
                        inferMediaType(pf.url!, pf.file.type),
                        pf.title.trim() || pf.file.name,
                        pf.url!
                      );
                    }
                    setPendingFiles((prev) => prev.filter((pf) => !pf.url || pf.uploading));
                    setDuplicateFileNames([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }
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
