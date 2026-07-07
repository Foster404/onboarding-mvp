"use client";

import { useMemo, useState } from "react";
import type { ColleagueDirectoryRow } from "@/types/database";
import { daysUntilNextBirthday, formatDayMonth } from "@/lib/dates";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/employee-status";

const BIRTHDAY_SOON_WINDOW_DAYS = 7;

export default function ColleagueDirectory({ colleagues }: { colleagues: ColleagueDirectoryRow[] }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(colleagues.map((c) => c.department).filter(Boolean))) as string[],
    [colleagues]
  );

  const filtered = colleagues.filter((c) => {
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesDept = department === "all" || c.department === department;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((c) => {
          const birthdaySoon = c.birthdate ? daysUntilNextBirthday(c.birthdate) <= BIRTHDAY_SOON_WINDOW_DAYS : false;
          const isExpanded = expandedId === c.id;

          return (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {c.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photo_url} alt={c.full_name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{c.full_name}</div>
                    <div className="text-sm text-slate-500">{c.department ?? "—"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {birthdaySoon && c.birthdate && (
                    <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-700">
                      Birthday {formatDayMonth(c.birthdate)}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[c.status]}`}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
                  <div>
                    <div className="text-slate-500">Email</div>
                    <div className="text-slate-900">{c.email}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Phone</div>
                    <div className="text-slate-900">{c.phone ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Birth date</div>
                    <div className="text-slate-900">
                      {c.birthdate ? formatDayMonth(c.birthdate) : "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-400">No colleagues match your search.</p>
        )}
      </div>
    </div>
  );
}
