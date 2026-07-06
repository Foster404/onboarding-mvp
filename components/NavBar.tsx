import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { signOut } from "@/app/actions/auth";
import SignOutButton from "@/components/SignOutButton";
import Logo from "@/components/Logo";

export default async function NavBar() {
  const current = await getCurrentUser();
  if (!current) return null;

  const { profile } = current;
  const isAdmin = profile.role === "admin";
  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navLinks = isAdmin
    ? [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/employees", label: "Employees" },
        { href: "/admin/content", label: "Onboarding Content" },
      ]
    : [
        { href: "/", label: "My Onboarding" },
        { href: "/profile", label: "My Profile" },
        { href: "/colleagues", label: "Colleagues" },
      ];

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
          <span className="mr-4 flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-base font-semibold text-slate-900">Orbit</span>
          </span>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials}
            </span>
            <span className="hidden items-center gap-1.5 text-sm text-slate-600 md:flex">
              {profile.full_name}
              {isAdmin && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                  Admin
                </span>
              )}
            </span>
          </div>
          <form action={signOut}>
            <SignOutButton />
          </form>
        </div>
      </div>
    </header>
  );
}
