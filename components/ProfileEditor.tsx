"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import Spinner from "@/components/Spinner";

export default function ProfileEditor({
  profile,
  userId,
  overallProgress,
}: {
  profile: Profile;
  userId: string;
  overallProgress: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [birthdate, setBirthdate] = useState(profile.birthdate ?? "");
  const [photoUrl, setPhotoUrl] = useState(profile.photo_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ birthdate: birthdate || null, photo_url: photoUrl })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Overall progress (90 days)</h2>
          <span className="text-sm font-semibold text-indigo-700">{overallProgress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Profile photo" className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading && <Spinner className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Change photo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="birthdate" className="text-sm font-medium text-slate-700">
          Date of birth
        </label>
        <input
          id="birthdate"
          type="date"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
        <div>
          <div className="text-slate-500">Department</div>
          <div className="font-medium text-slate-900">{profile.department ?? "—"}</div>
        </div>
        <div>
          <div className="text-slate-500">Vacation days remaining</div>
          <div className="font-medium text-slate-900">{profile.vacation_days_remaining}</div>
          <div className="text-xs text-slate-400">Managed by HR</div>
        </div>
        <div>
          <div className="text-slate-500">Probation started</div>
          <div className="font-medium text-slate-900">
            {new Date(profile.onboarding_start_date).toLocaleDateString()}
          </div>
          <div className="text-xs text-slate-400">Managed by HR</div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || uploading}
        className="flex w-fit items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving && <Spinner />}
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
