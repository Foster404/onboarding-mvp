import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  computeStageProgress,
  currentStage,
  fetchAllCompletedProgress,
  overallPercent,
} from "@/lib/onboarding-progress";
import type { StageWithItems } from "@/lib/onboarding-progress";
import EmployeesTable, { type EmployeeRow, type EmployeesTableQuery } from "@/components/EmployeesTable";

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const initialQuery: EmployeesTableQuery = {
    q: first(params.q),
    dept: first(params.dept),
    status: first(params.status),
    role: first(params.role),
    process: first(params.process),
    sort: first(params.sort),
    dir: first(params.dir),
  };

  const supabase = await createClient();

  const [{ data: employees }, { data: stages }, progress] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name", { ascending: true }),
    supabase
      .from("stages")
      .select("*, checklist_items(*)")
      .order("sort_order", { ascending: true }),
    fetchAllCompletedProgress(supabase),
  ]);

  const progressByEmployee = new Map<string, Set<string>>();
  for (const row of progress) {
    if (!progressByEmployee.has(row.profile_id)) progressByEmployee.set(row.profile_id, new Set());
    progressByEmployee.get(row.profile_id)!.add(row.checklist_item_id);
  }

  const rows: EmployeeRow[] = (employees ?? []).map((employee) => {
    const completedIds = progressByEmployee.get(employee.id) ?? new Set<string>();
    const stageProgress = computeStageProgress((stages ?? []) as StageWithItems[], completedIds);
    const current = currentStage(stageProgress);
    const percent = overallPercent(stageProgress);

    return {
      id: employee.id,
      fullName: employee.full_name,
      role: employee.role,
      department: employee.department,
      status: employee.status,
      birthdate: employee.birthdate,
      onboardingStartDate: employee.onboarding_start_date,
      probationEndDate: employee.probation_end_date,
      currentStageTitle: current?.stage.title ?? "—",
      percent,
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500">Onboarding progress across the company.</p>
        </div>
        <Link
          href="/admin/employees/new"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          New employee
        </Link>
      </div>

      <EmployeesTable rows={rows} initialQuery={initialQuery} />
    </div>
  );
}
