import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import ProfileEditor from "@/components/ProfileEditor";

export default async function ProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">My Profile</h1>
      <p className="mb-6 text-sm text-slate-500">
        Update your photo and date of birth. Other fields are managed by HR.
      </p>
      <ProfileEditor profile={current.profile} userId={current.userId} />
    </div>
  );
}
