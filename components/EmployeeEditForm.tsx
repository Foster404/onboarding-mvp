"use client";

import { useRef, useState } from "react";
import { updateEmployeeProfile, resetEmployeePassword } from "@/app/actions/admin-employees";
import { createClient } from "@/lib/supabase/client";
import type { EmployeeStatus, Profile } from "@/types/database";
import { DEPARTMENTS } from "@/lib/departments";
import { STATUS_OPTIONS } from "@/lib/employee-status";
import { PASSWORD_REQUIREMENTS_TEXT, isPasswordValid } from "@/lib/password";
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
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setPhotoError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      setPhotoError(uploadError.message);
      setUploadingPhoto(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setUploadingPhoto(false);

    try {
      await updateEmployeeProfile(profile.id, { photo_url: data.publicUrl });
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to save photo");
    }
  }

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

      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Profile photo" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-sm text-slate-500">Email</div>
            <div className="text-sm font-medium text-slate-900">{profile.email}</div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {uploadingPhoto && <Spinner className="h-3.5 w-3.5" />}
              {uploadingPhoto ? "Uploading..." : "Change photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
          </div>
        </div>
      </div>

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
                disabled={resettingPassword || !isPasswordValid(newPassword)}
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
            <p className="text-xs text-slate-400">{PASSWORD_REQUIREMENTS_TEXT}</p>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordResetDone && <p className="text-sm text-emerald-600">Password updated.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
