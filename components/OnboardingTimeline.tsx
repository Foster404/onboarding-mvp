"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItem } from "@/app/actions/progress";
import type { ChecklistItem, Stage, StageMedia } from "@/types/database";

export type StageWithContent = Stage & {
  checklist_items: ChecklistItem[];
  stage_media: StageMedia[];
};

function statusForPercent(percent: number): { label: string; className: string } {
  if (percent === 0) return { label: "Planned", className: "bg-slate-100 text-slate-600" };
  if (percent === 100) return { label: "Completed", className: "bg-emerald-100 text-emerald-700" };
  return { label: "In progress", className: "bg-amber-100 text-amber-700" };
}

function MediaEmbed({ media }: { media: StageMedia }) {
  const isYouTube = media.url.includes("youtube.com") || media.url.includes("youtu.be");

  if (media.type === "video" && isYouTube) {
    const embedUrl = media.url
      .replace("watch?v=", "embed/")
      .replace("youtu.be/", "youtube.com/embed/");
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md border border-slate-200">
        <iframe src={embedUrl} className="h-full w-full" allowFullScreen title={media.title} />
      </div>
    );
  }

  if (media.type === "video") {
    return (
      <video controls className="w-full rounded-md border border-slate-200">
        <source src={media.url} />
      </video>
    );
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className="inline-block rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
    >
      Open presentation: {media.title}
    </a>
  );
}

function StageCard({
  stage,
  completedIds,
}: {
  stage: StageWithContent;
  completedIds: Set<string>;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Set<string>>(completedIds);

  const total = stage.checklist_items.length;
  const completedCount = stage.checklist_items.filter((i) => optimistic.has(i.id)).length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const status = statusForPercent(percent);

  function handleToggle(itemId: string, checked: boolean) {
    setOptimistic((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });

    startTransition(async () => {
      await toggleChecklistItem(itemId, checked);
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{stage.title}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label} · {percent}%
        </span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mb-4 flex flex-col gap-2">
        {stage.checklist_items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={optimistic.has(item.id)}
              disabled={pending}
              onChange={(e) => handleToggle(item.id, e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span
              className={`text-sm ${
                optimistic.has(item.id) ? "text-slate-400 line-through" : "text-slate-700"
              }`}
            >
              {item.title}
            </span>
          </li>
        ))}
        {total === 0 && <li className="text-sm text-slate-400">No checklist items yet.</li>}
      </ul>

      {stage.stage_media.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          {stage.stage_media.map((m) => (
            <MediaEmbed key={m.id} media={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingTimeline({
  stages,
  completedIds,
}: {
  stages: StageWithContent[];
  completedIds: string[];
}) {
  const completedSet = new Set(completedIds);
  const totalItems = stages.reduce((sum, s) => sum + s.checklist_items.length, 0);
  const totalCompleted = stages.reduce(
    (sum, s) => sum + s.checklist_items.filter((i) => completedSet.has(i.id)).length,
    0
  );
  const overallPercent = totalItems === 0 ? 0 : Math.round((totalCompleted / totalItems) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Overall progress (90 days)</h2>
          <span className="text-sm font-medium text-slate-600">{overallPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {stages.map((stage) => (
        <StageCard key={stage.id} stage={stage} completedIds={completedSet} />
      ))}
    </div>
  );
}
