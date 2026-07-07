import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeStageProgress, currentStage, fetchAllCompletedProgress, overallPercent } from "@/lib/onboarding-progress";
import type { StageWithItems } from "@/lib/onboarding-progress";
import { daysSince, daysUntilNextBirthday, formatDate, formatDayMonth } from "@/lib/dates";
import { STATUS_LABELS } from "@/lib/employee-status";
import type { EmployeeStatus } from "@/types/database";
import PieChart from "@/components/PieChart";
import BarList from "@/components/BarList";
import StackedBar from "@/components/StackedBar";

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  working: "#10b981",
  vacation: "#f59e0b",
  maternity_leave: "#ec4899",
  resigned: "#94a3b8",
};

// Days since probation start by which each stage is expected to be done.
// Past the deadline with the stage still incomplete counts as overdue.
const STAGE_DEADLINE_DAYS: Record<string, number> = {
  week_1: 10,
  "30_days": 30,
  "60_days": 60,
  "90_days": 90,
};

const BIRTHDAY_WINDOW_DAYS = 7;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: stages }, progress] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("stages").select("*, checklist_items(*)").order("sort_order", { ascending: true }),
    fetchAllCompletedProgress(supabase),
  ]);

  const progressByEmployee = new Map<string, Set<string>>();
  for (const row of progress) {
    if (!progressByEmployee.has(row.profile_id)) progressByEmployee.set(row.profile_id, new Set());
    progressByEmployee.get(row.profile_id)!.add(row.checklist_item_id);
  }

  const allProfiles = profiles ?? [];
  const stageList = (stages ?? []) as StageWithItems[];
  const admins = allProfiles.filter((p) => p.role === "admin");
  const employees = allProfiles.filter((p) => p.role === "employee");

  const employeeProgress = employees.map((employee) => {
    const completedIds = progressByEmployee.get(employee.id) ?? new Set<string>();
    const stageProgress = computeStageProgress(stageList, completedIds);
    const current = currentStage(stageProgress);
    const percent = overallPercent(stageProgress);
    return { employee, percent, currentStageTitle: current?.stage.title ?? "—", stageProgress };
  });

  const finished = employeeProgress.filter((e) => e.percent === 100);
  const active = employeeProgress.filter((e) => e.percent < 100);

  const percentByEmployeeId = new Map(employeeProgress.map((e) => [e.employee.id, e.percent]));

  const lastStarted = [...employees]
    .sort(
      (a, b) => new Date(b.onboarding_start_date).getTime() - new Date(a.onboarding_start_date).getTime()
    )
    .slice(0, 10);

  // Stage funnel: how many still-active employees currently sit in each
  // stage. Finished employees are excluded - the point of this chart is to
  // show where people are stuck, not to re-state the Finished count.
  const stageFunnel = stageList.map((stage) => ({
    label: stage.title,
    value: active.filter((e) => e.currentStageTitle === stage.title).length,
    color: "#4f46e5",
  }));

  // Status breakdown across every profile (employees and admins alike).
  // Fixed order so Resigned always lands last, rather than whatever order
  // the rows happened to come back from the database.
  const STATUS_ORDER: EmployeeStatus[] = ["working", "vacation", "maternity_leave", "resigned"];
  const statusCounts = new Map<EmployeeStatus, number>();
  for (const p of allProfiles) {
    statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);
  }
  const statusBreakdown = STATUS_ORDER.map((status) => ({
    label: STATUS_LABELS[status],
    value: statusCounts.get(status) ?? 0,
    color: STATUS_COLORS[status],
  }));

  // Department rollup: total headcount per department.
  const byDepartment = new Map<string, { count: number; activeCount: number; activePercentSum: number }>();
  for (const e of employeeProgress) {
    const key = e.employee.department ?? "No department";
    const entry = byDepartment.get(key) ?? { count: 0, activeCount: 0, activePercentSum: 0 };
    entry.count += 1;
    if (e.percent < 100) {
      entry.activeCount += 1;
      entry.activePercentSum += e.percent;
    }
    byDepartment.set(key, entry);
  }
  const departmentRollup = Array.from(byDepartment.entries())
    .map(([label, { count }]) => ({ label, value: count, color: "#818cf8" }))
    .sort((a, b) => b.value - a.value);

  // Same breakdown, but headcount and average progress only for people
  // still in the onboarding process (as opposed to the department rollup's
  // total headcount) - this is where the average actually means something,
  // since finished employees would otherwise pull it toward 100%.
  const departmentInProgress = Array.from(byDepartment.entries())
    .filter(([, { activeCount }]) => activeCount > 0)
    .map(([label, { activeCount, activePercentSum }]) => ({
      label,
      value: activeCount,
      sublabel: `· ${Math.round(activePercentSum / activeCount)}% avg`,
      color: "#a78bfa",
    }))
    .sort((a, b) => b.value - a.value);

  // At risk: for each employee still onboarding, find the earliest stage
  // that has passed its expected deadline (days since probation start)
  // while still incomplete - e.g. more than 10 days in and Week 1 isn't
  // done, or more than 30 days in and 30 Days isn't done. Resigned
  // employees are excluded since they're no longer on the clock.
  const atRiskAll = employeeProgress
    .filter((e) => e.percent < 100 && e.employee.status !== "resigned")
    .map((e) => {
      const elapsed = daysSince(e.employee.onboarding_start_date);
      const overdueStage = e.stageProgress.find(
        (sp) =>
          STAGE_DEADLINE_DAYS[sp.stage.key] !== undefined &&
          sp.percent < 100 &&
          elapsed > STAGE_DEADLINE_DAYS[sp.stage.key]
      );
      if (!overdueStage) return null;
      return {
        employee: e.employee,
        percent: e.percent,
        stageTitle: overdueStage.stage.title,
        daysOverdue: elapsed - STAGE_DEADLINE_DAYS[overdueStage.stage.key],
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  const atRisk = atRiskAll.slice(0, 10);

  // Upcoming birthdays across the whole company.
  const upcomingBirthdays = allProfiles
    .filter((p): p is typeof p & { birthdate: string } => !!p.birthdate)
    .map((p) => ({ profile: p, daysUntil: daysUntilNextBirthday(p.birthdate) }))
    .filter((p) => p.daysUntil <= BIRTHDAY_WINDOW_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Company-wide onboarding overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total employees" value={allProfiles.length} />
        <StatCard label="Active onboarding" value={active.length} />
        <StatCard label="Finished onboarding" value={finished.length} />
        <StatCard label="Overdue" value={atRiskAll.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Company composition">
          <PieChart
            segments={[
              { label: "Active onboarding", value: active.length, color: "#a78bfa" },
              { label: "Finished onboarding", value: finished.length, color: "#4f46e5" },
              { label: "Admins", value: admins.length, color: "#cbd5e1" },
            ]}
          />
        </Card>

        <Card title="Onboarding stage funnel">
          <BarList items={stageFunnel} />
        </Card>

        <Card title="Department rollup">
          <BarList items={departmentRollup} />
        </Card>

        <Card title="In onboarding by department">
          <BarList items={departmentInProgress} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">Overdue</h2>
            <p className="text-xs text-slate-400">Past a stage&apos;s expected deadline, still incomplete</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Stuck at</th>
                <th className="px-4 py-2.5 font-medium">Process</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map(({ employee, percent, stageTitle, daysOverdue }) => (
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
                    {stageTitle} <span className="text-red-600">({daysOverdue}d overdue)</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{percent}%</td>
                </tr>
              ))}
              {atRisk.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    Nobody overdue right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">Upcoming birthdays</h2>
            <p className="text-xs text-slate-400">Next {BIRTHDAY_WINDOW_DAYS} days, company-wide</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {upcomingBirthdays.map(({ profile, daysUntil: days }) => (
              <li key={profile.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{profile.full_name}</span>
                <span className="text-slate-500">
                  {formatDayMonth(profile.birthdate!)}{" "}
                  <span className="text-slate-400">{days === 0 ? "· today" : `· in ${days}d`}</span>
                </span>
              </li>
            ))}
            {upcomingBirthdays.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-400">No birthdays coming up.</li>
            )}
          </ul>
        </div>
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
                  {formatDate(employee.onboarding_start_date)}
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

      <div className="mt-2 border-t border-slate-200 pt-6">
        <Card title="Status breakdown">
          <StackedBar items={statusBreakdown} />
        </Card>
      </div>
    </div>
  );
}
