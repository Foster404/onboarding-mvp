import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeStageProgress, currentStage, overallPercent } from "@/lib/onboarding-progress";
import type { StageWithItems } from "@/lib/onboarding-progress";

export default async function AdminEmployeesPage() {
  const supabase = await createClient();

  const [{ data: employees }, { data: stages }, { data: progress }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "employee")
      .order("full_name", { ascending: true }),
    supabase
      .from("stages")
      .select("*, checklist_items(*)")
      .order("sort_order", { ascending: true }),
    supabase.from("employee_progress").select("profile_id, checklist_item_id").eq("completed", true),
  ]);

  const progressByEmployee = new Map<string, Set<string>>();
  for (const row of progress ?? []) {
    if (!progressByEmployee.has(row.profile_id)) progressByEmployee.set(row.profile_id, new Set());
    progressByEmployee.get(row.profile_id)!.add(row.checklist_item_id);
  }

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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Department</th>
              <th className="px-4 py-2.5 font-medium">Current stage</th>
              <th className="px-4 py-2.5 font-medium">Overall progress</th>
            </tr>
          </thead>
          <tbody>
            {(employees ?? []).map((employee) => {
              const completedIds = progressByEmployee.get(employee.id) ?? new Set<string>();
              const stageProgress = computeStageProgress(
                (stages ?? []) as StageWithItems[],
                completedIds
              );
              const current = currentStage(stageProgress);
              const percent = overallPercent(stageProgress);

              return (
                <tr key={employee.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/employees/${employee.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {employee.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{employee.department ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{current?.stage.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-slate-600">{percent}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(employees ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
