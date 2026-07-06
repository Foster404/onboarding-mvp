import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: caller } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (caller?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const fullName = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const department = String(body.department ?? "").trim();
  const birthdate = body.birthdate ? String(body.birthdate).trim() : null;
  const onboardingStartDate = String(body.onboarding_start_date ?? "").trim();

  if (!fullName || !email || !department || !onboardingStartDate) {
    return NextResponse.json(
      { error: "Full name, email, department, and probation start date are required" },
      { status: 400 }
    );
  }

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create user" }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    email,
    department,
    birthdate,
    onboarding_start_date: onboardingStartDate,
    role: "employee",
    status: "working",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ email, tempPassword });
}
