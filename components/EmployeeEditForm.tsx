"use client";

import { useState } from "react";
import { updateEmployeeProfile, resetEmployeePassword } from "@/app/actions/admin-employees";
import type { EmployeeStatus, Profile } from "@/types/database";
import { DEPARTMENTS } from "@/lib/departments";
import { STATUS_OPTIONS } from "@/lib/employee-status";
import Spinner from "@/components/Spinner";

const FIELD_CLASS =
  "h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

export default function EmployeeEditForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [department, setDepartment] = useState(profile.department ?? "");
  const [birthdate, setBirthdate] = useState(profile.birthdate ?? "");
  const [onboardingStartDate, setOnboardingStartDate] = useState(profile.onboarding_start_date);
  const [probationEndDate, setProbationEndDate] = useState(profile.probation_end_date);
  const [status, setStatus] = useState<EmployeeStatus>(profile.status);
  const [vacationDays, setVacationDays] = useState(profile.vacation_days_remaining);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetDone, setPasswordResetDone] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleResetPassword() {
    setResettingPassword(true);
    setPasswordError(null);
    setPasswordResetDone(false);
    try {
      await resetEmployeePassword(profile.id, newPassword);
      setPasswordResetDone(true);
      setNewPassword("");
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateEmployeeProfile(profile.id, {
        full_name: fullName,
        department: department || null,
        birthdate: birthdate || null,
        onboarding_start_date: onboardingStartDate,
        probation_end_date: probationEndDate,
        status,
        vacation_days_remaining: vacationDays,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Profile</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Select a department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Birth date</label>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Probation start date</label>
          <input
            type="date"
            value={onboardingStartDate}
            onChange={(e) => setOnboardingStartDate(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
            className={FIELD_CLASS}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Probation end date</label>
          <input
            type="date"
            value={probationEndDate}
            onChange={(e) => setProbationEndDate(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Vacation days remaining</label>
          <input
            type="number"
            min={0}
            value={vacationDays}
            onChange={(e) => setVacationDays(Number(e.target.value))}
            className={FIELD_CLASS}
          />
          <span className="text-xs text-slate-400">Manual for MVP; future 1C sync target</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex w-fit items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving && <Spinner />}
        {saving ? "Saving..." : "Save changes"}
      </button>

      <div className="border-t border-slate-100 pt-4">
        {!showResetPassword ? (
          <button
            type="button"
            onClick={() => setShowResetPassword(true)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Reset password
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">New password</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter a new password"
                minLength={6}
                className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resettingPassword || newPassword.length < 6}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {resettingPassword && <Spinner />}
                {resettingPassword ? "Setting..." : "Set new password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setNewPassword("");
                  setPasswordError(null);
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordResetDone && <p className="text-sm text-emerald-600">Password updated.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
