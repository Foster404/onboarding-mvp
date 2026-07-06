"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { EmployeeStatus, UserRole } from "@/types/database";
import { formatDate } from "@/lib/dates";
import { STATUS_LABELS, STATUS_OPTIONS } from "@/lib/employee-status";

export type EmployeeRow = {
  id: string;
  fullName: string;
  role: UserRole;
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
  birthdate: "Birth date",
  probationStart: "Probation start date",
  probationEnd: "Probation end date",
  status: "Status",
  currentStage: "Stage",
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
        <span className="flex items-center gap-1.5">
          <Link href={`/admin/employees/${row.id}`} className="font-medium text-slate-900 hover:underline">
            {row.fullName}
          </Link>
          {row.role === "admin" && (
            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
              Admin
            </span>
          )}
        </span>
      );
    case "department":
      return row.department ?? "—";
    case "birthdate":
      return row.birthdate ? formatDate(row.birthdate) : "—";
    case "probationStart":
      return formatDate(row.onboardingStartDate);
    case "probationEnd":
      return formatDate(row.probationEndDate);
    case "status":
      return STATUS_LABELS[row.status];
    case "currentStage":
      return row.percent === 100 ? "Finished" : row.currentStageTitle;
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
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
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
      const matchesRole = roleFilter === "all" || r.role === roleFilter;
      return matchesSearch && matchesDept && matchesStatus && matchesRole;
    });

    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortColumn);
      const bv = sortValue(b, sortColumn);
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, search, departmentFilter, statusFilter, roleFilter, sortColumn, sortDirection]);

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
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">Employees &amp; admins</option>
          <option value="employee">Employees only</option>
          <option value="admin">Admins only</option>
        </select>
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
