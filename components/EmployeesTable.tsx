"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

type ProcessFilter = "all" | "finished" | "not_finished";

export type EmployeesTableQuery = {
  q?: string;
  dept?: string;
  status?: string;
  role?: string;
  process?: string;
  sort?: string;
  dir?: string;
};

const COLUMN_LABEL_LINES: Record<ColumnId, string[]> = {
  name: ["Name"],
  department: ["Department"],
  birthdate: ["Birth date"],
  probationStart: ["Probation", "start date"],
  probationEnd: ["Probation", "end date"],
  status: ["Status"],
  currentStage: ["Stage"],
  progress: ["Process"],
};

const COLUMN_WIDTHS: Record<ColumnId, string> = {
  name: "18%",
  department: "12%",
  birthdate: "10%",
  probationStart: "11%",
  probationEnd: "11%",
  status: "13%",
  currentStage: "11%",
  progress: "14%",
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

const COLUMN_IDS = new Set<string>(DEFAULT_COLUMN_ORDER);

function isColumnId(value: string): value is ColumnId {
  return COLUMN_IDS.has(value);
}

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
        <span className="flex min-w-0 items-center gap-1.5">
          <Link
            href={`/admin/employees/${row.id}`}
            title={row.fullName}
            className="truncate font-medium text-slate-900 hover:underline"
          >
            {row.fullName}
          </Link>
          {row.role === "admin" && (
            <span className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
              Admin
            </span>
          )}
        </span>
      );
    case "department":
      return (
        <span className="block truncate" title={row.department ?? undefined}>
          {row.department ?? "—"}
        </span>
      );
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
        <div className="flex items-center justify-start gap-1.5">
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

export default function EmployeesTable({
  rows,
  initialQuery,
}: {
  rows: EmployeeRow[];
  initialQuery?: EmployeesTableQuery;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [sortColumn, setSortColumn] = useState<ColumnId>(
    initialQuery?.sort && isColumnId(initialQuery.sort) ? initialQuery.sort : "progress"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialQuery?.dir === "desc" ? "desc" : "asc"
  );
  const [search, setSearch] = useState(initialQuery?.q ?? "");
  const [departmentFilter, setDepartmentFilter] = useState(initialQuery?.dept ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_resigned" | EmployeeStatus>(
    (initialQuery?.status as EmployeeStatus | "not_resigned" | undefined) ?? "all"
  );
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>(
    (initialQuery?.role as UserRole | undefined) ?? "all"
  );
  const [processFilter, setProcessFilter] = useState<ProcessFilter>(
    (initialQuery?.process as ProcessFilter | undefined) ?? "all"
  );
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const draggedColumn = useRef<ColumnId | null>(null);

  function syncUrl(next: {
    search?: string;
    departmentFilter?: string;
    statusFilter?: string;
    roleFilter?: string;
    processFilter?: string;
    sortColumn?: string;
    sortDirection?: string;
  }) {
    const merged = {
      search,
      departmentFilter,
      statusFilter,
      roleFilter,
      processFilter,
      sortColumn,
      sortDirection,
      ...next,
    };

    const params = new URLSearchParams();
    if (merged.search) params.set("q", merged.search);
    if (merged.departmentFilter !== "all") params.set("dept", merged.departmentFilter);
    if (merged.statusFilter !== "all") params.set("status", merged.statusFilter);
    if (merged.roleFilter !== "all") params.set("role", merged.roleFilter);
    if (merged.processFilter !== "all") params.set("process", merged.processFilter);
    if (merged.sortColumn !== "progress") params.set("sort", merged.sortColumn);
    if (merged.sortDirection !== "asc") params.set("dir", merged.sortDirection);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

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
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "not_resigned" ? r.status !== "resigned" : r.status === statusFilter);
      const matchesRole = roleFilter === "all" || r.role === roleFilter;
      const matchesProcess =
        processFilter === "all" ||
        (processFilter === "finished" && r.percent === 100) ||
        (processFilter === "not_finished" && r.percent >= 0 && r.percent <= 90);
      return matchesSearch && matchesDept && matchesStatus && matchesRole && matchesProcess;
    });

    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortColumn);
      const bv = sortValue(b, sortColumn);
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, search, departmentFilter, statusFilter, roleFilter, processFilter, sortColumn, sortDirection]);

  function handleSort(col: ColumnId) {
    if (sortColumn === col) {
      const nextDirection = sortDirection === "asc" ? "desc" : "asc";
      setSortDirection(nextDirection);
      syncUrl({ sortDirection: nextDirection });
    } else {
      setSortColumn(col);
      setSortDirection("asc");
      syncUrl({ sortColumn: col, sortDirection: "asc" });
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

  function clearFilters() {
    setSearch("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setRoleFilter("all");
    setProcessFilter("all");
    syncUrl({
      search: "",
      departmentFilter: "all",
      statusFilter: "all",
      roleFilter: "all",
      processFilter: "all",
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search name or department..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            syncUrl({ search: e.target.value });
          }}
          className="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        />
        <select
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            syncUrl({ departmentFilter: e.target.value });
          }}
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
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | "not_resigned" | EmployeeStatus);
            syncUrl({ statusFilter: e.target.value });
          }}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="not_resigned">All except resigned</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as "all" | UserRole);
            syncUrl({ roleFilter: e.target.value });
          }}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">Employees &amp; admins</option>
          <option value="employee">Employees only</option>
          <option value="admin">Admins only</option>
        </select>
        <select
          value={processFilter}
          onChange={(e) => {
            setProcessFilter(e.target.value as ProcessFilter);
            syncUrl({ processFilter: e.target.value });
          }}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All process</option>
          <option value="finished">Finished</option>
          <option value="not_finished">Not finished</option>
        </select>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Clear filters
        </button>
      </div>

      <p className="mb-2 text-sm text-slate-500">
        Showing {visibleRows.length} {visibleRows.length === 1 ? "employee" : "employees"}
      </p>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            {columnOrder.map((col) => (
              <col key={col} style={{ width: COLUMN_WIDTHS[col] }} />
            ))}
          </colgroup>
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
                  className={`cursor-move select-none px-2 py-1.5 text-center font-semibold ${
                    dragOverColumn === col ? "bg-indigo-50" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col)}
                    className="flex w-full items-center justify-center gap-1 text-center hover:text-slate-900"
                  >
                    <span className="leading-tight">
                      {COLUMN_LABEL_LINES[col].map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </span>
                    {sortColumn === col && (
                      <span className="shrink-0 text-[10px]">{sortDirection === "asc" ? "▲" : "▼"}</span>
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
                  <td
                    key={col}
                    className={`truncate px-2 py-2 text-slate-600 ${
                      col === "name" || col === "progress" ? "text-left" : "text-center"
                    }`}
                  >
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columnOrder.length} className="px-2 py-6 text-center text-slate-400">
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
