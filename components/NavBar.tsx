import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { signOut } from "@/app/actions/auth";

export default async function NavBar() {
  const current = await getCurrentUser();
  if (!current) return null;

  const { profile } = current;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link href="/" className="text-slate-900 font-semibold">
            Onboarding
          </Link>
          <Link href="/" className="hover:text-slate-900">
            My Onboarding
          </Link>
          <Link href="/profile" className="hover:text-slate-900">
            My Profile
          </Link>
          <Link href="/colleagues" className="hover:text-slate-900">
            Colleagues
          </Link>
          {profile.role === "admin" && (
            <Link href="/admin" className="hover:text-slate-900">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{profile.full_name}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
