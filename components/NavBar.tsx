import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { signOut } from "@/app/actions/auth";

export default async function NavBar() {
  const current = await getCurrentUser();
  if (!current) return null;

  const { profile } = current;
  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
          <Link href="/" className="mr-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-sm shadow-indigo-500/30">
              O
            </span>
            <span className="font-semibold text-slate-900">Orbit</span>
          </Link>
          <Link href="/" className="whitespace-nowrap rounded-md px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            My Onboarding
          </Link>
          <Link href="/profile" className="whitespace-nowrap rounded-md px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            My Profile
          </Link>
          <Link href="/colleagues" className="whitespace-nowrap rounded-md px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
            Colleagues
          </Link>
          {profile.role === "admin" && (
            <Link href="/admin" className="whitespace-nowrap rounded-md px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials}
            </span>
            <span className="hidden text-sm text-slate-600 md:inline">{profile.full_name}</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
