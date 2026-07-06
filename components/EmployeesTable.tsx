"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { EmployeeStatus } from "@/types/database";

export type EmployeeRow = {
  id: string;
  fullName: string;
  department: string | null;
  status: EmployeeStatus;
  birthdate: string | null;
  onboardingStartDate: string;
  probationEndDate: string;
  currentStageTitle: string;
  percent: number;
};

type ColumnId =
  | "name"
  | "department"
  | "birthdate"
  | "probationStart"
  | "probationEnd"
  | "status"
  | "currentStage"
  | "progress";

const COLUMN_LABELS: Record<ColumnId, string> = {
  name: "Name",
  department: "Department",
  birthdate: "Date of birth",
  probationStart: "Probation started",
  probationEnd: "Probation ends",
  status: "Status",
  currentStage: "Current stage",
  progress: "Overall progress",
};

const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  "name",
  "department",
  "birthdate",
  "probationStart",
  "probationEnd",
  "status",
  "currentStage",
  "progress",
];

function sortValue(row: EmployeeRow, col: ColumnId): string | number {
  switch (col) {
    case "name":
      return row.fullName.toLowerCase();
    case "department":
      return (row.department ?? "").toLowerCase();
    case "birthdate":
      return row.birthdate ?? "";
    case "probationStart":
      return row.onboardingStartDate;
    case "probationEnd":
      return row.probationEndDate;
    case "status":
      return row.status;
    case "currentStage":
      return row.currentStageTitle.toLowerCase();
    case "progress":
      return row.percent;
  }
}

function renderCell(row: EmployeeRow, col: ColumnId) {
  switch (col) {
    case "name":
      return (
        <Link href={`/admin/employees/${row.id}`} className="font-medium text-slate-900 hover:underline">
          {row.fullName}
        </Link>
      );
    case "department":
      return row.department ?? "—";
    case "birthdate":
      return row.birthdate ? new Date(row.birthdate).toLocaleDateString() : "—";
    case "probationStart":
      return new Date(row.onboardingStartDate).toLocaleDateString();
    case "probationEnd":
      return new Date(row.probationEndDate).toLocaleDateString();
    case "status":
      return row.status === "working" ? "At work" : "On vacation";
    case "currentStage":
      return row.currentStageTitle;
    case "progress":
      return (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${row.percent}%` }}
            />
          </div>
          <span className="text-slate-600">{row.percent}%</span>
        </div>
      );
  }
}

export default function EmployeesTable({ rows }: { rows: EmployeeRow[] }) {
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [sortColumn, setSortColumn] = useState<ColumnId>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EmployeeStatus>("all");
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const draggedColumn = useRef<ColumnId | null>(null);

  const departments = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.department).filter((d): d is string => !!d))).sort(),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      const matchesSearch =
        query === "" ||
        r.fullName.toLowerCase().includes(query) ||
        (r.department ?? "").toLowerCase().includes(query);
      const matchesDept = departmentFilter === "all" || r.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortColumn);
      const bv = sortValue(b, sortColumn);
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, search, departmentFilter, statusFilter, sortColumn, sortDirection]);

  function handleSort(col: ColumnId) {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  }

  function handleDrop(targetCol: ColumnId) {
    const source = draggedColumn.current;
    draggedColumn.current = null;
    setDragOverColumn(null);
    if (!source || source === targetCol) return;

    setColumnOrder((prev) => {
      const next = prev.filter((c) => c !== source);
      next.splice(next.indexOf(targetCol), 0, source);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search name or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | EmployeeStatus)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="working">At work</option>
          <option value="vacation">On vacation</option>
        </select>
        <span className="text-xs text-slate-400">
          {visibleRows.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              {columnOrder.map((col) => (
                <th
                  key={col}
                  draggable
                  onDragStart={() => {
                    draggedColumn.current = col;
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverColumn(col);
                  }}
                  onDragLeave={() => setDragOverColumn((c) => (c === col ? null : c))}
                  onDrop={() => handleDrop(col)}
                  onDragEnd={() => {
                    draggedColumn.current = null;
                    setDragOverColumn(null);
                  }}
                  className={`cursor-move select-none whitespace-nowrap px-2.5 py-1.5 font-medium ${
                    dragOverColumn === col ? "bg-indigo-50" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col)}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    {COLUMN_LABELS[col]}
                    {sortColumn === col && (
                      <span className="text-[10px]">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                {columnOrder.map((col) => (
                  <td key={col} className="whitespace-nowrap px-2.5 py-2 text-slate-600">
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columnOrder.length} className="px-2.5 py-6 text-center text-slate-400">
                  No employees match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
