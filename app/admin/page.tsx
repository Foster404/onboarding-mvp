import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeStageProgress, overallPercent } from "@/lib/onboarding-progress";
import type { StageWithItems } from "@/lib/onboarding-progress";
import PieChart from "@/components/PieChart";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: stages }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("stages").select("*, checklist_items(*)").order("sort_order", { ascending: true }),
    supabase.from("employee_progress").select("profile_id, checklist_item_id").eq("completed", true),
  ]);

  const progressByEmployee = new Map<string, Set<string>>();
  for (const row of progress ?? []) {
    if (!progressByEmployee.has(row.profile_id)) progressByEmployee.set(row.profile_id, new Set());
    progressByEmployee.get(row.profile_id)!.add(row.checklist_item_id);
  }

  const allProfiles = profiles ?? [];
  const admins = allProfiles.filter((p) => p.role === "admin");
  const employees = allProfiles.filter((p) => p.role === "employee");

  const employeeProgress = employees.map((employee) => {
    const completedIds = progressByEmployee.get(employee.id) ?? new Set<string>();
    const stageProgress = computeStageProgress((stages ?? []) as StageWithItems[], completedIds);
    return { employee, percent: overallPercent(stageProgress) };
  });

  const finished = employeeProgress.filter((e) => e.percent === 100);
  const active = employeeProgress.filter((e) => e.percent < 100);
  const averageActivePercent =
    active.length === 0
      ? 0
      : Math.round(active.reduce((sum, e) => sum + e.percent, 0) / active.length);

  const percentByEmployeeId = new Map(employeeProgress.map((e) => [e.employee.id, e.percent]));

  const lastStarted = [...employees]
    .sort(
      (a, b) => new Date(b.onboarding_start_date).getTime() - new Date(a.onboarding_start_date).getTime()
    )
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Company-wide onboarding overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total employees" value={allProfiles.length} />
        <StatCard label="Active onboarding" value={active.length} />
        <StatCard label="Finished onboarding" value={finished.length} />
        <StatCard label="Average progress" value={`${averageActivePercent}%`} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Company composition</h2>
        <PieChart
          segments={[
            { label: "Finished onboarding", value: finished.length, color: "#4f46e5" },
            { label: "Active onboarding", value: active.length, color: "#a78bfa" },
            { label: "Admins", value: admins.length, color: "#cbd5e1" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Last 10 started onboarding</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Started</th>
              <th className="px-4 py-2.5 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {lastStarted.map((employee) => (
              <tr key={employee.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/employees/${employee.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {employee.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(employee.onboarding_start_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-slate-600">{percentByEmployeeId.get(employee.id) ?? 0}%</td>
              </tr>
            ))}
            {lastStarted.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
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
