import type { EmployeeStatus } from "@/types/database";

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  working: "At work",
  vacation: "On vacation",
  maternity_leave: "On maternity leave",
  resigned: "Resigned",
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [EmployeeStatus, string][];

export const STATUS_BADGE_CLASS: Record<EmployeeStatus, string> = {
  working: "bg-emerald-100 text-emerald-700",
  vacation: "bg-amber-100 text-amber-700",
  maternity_leave: "bg-pink-100 text-pink-700",
  resigned: "bg-slate-200 text-slate-600",
};
