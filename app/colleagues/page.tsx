import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import ColleagueDirectory from "@/components/ColleagueDirectory";

export default async function ColleaguesPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const supabase = await createClient();
  const { data: colleagues } = await supabase
    .from("colleague_directory")
    .select("*")
    .order("full_name", { ascending: true });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Colleagues</h1>
      <p className="mb-6 text-sm text-slate-500">
        Browse everyone in the company. Click a row to see contact details.
      </p>
      <ColleagueDirectory colleagues={colleagues ?? []} />
    </div>
  );
}
