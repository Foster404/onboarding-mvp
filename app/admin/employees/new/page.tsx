"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import BackButton from "@/components/BackButton";
import { DEPARTMENTS } from "@/lib/departments";

const FIELD_CLASS =
  "h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

export default function NewEmployeePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [onboardingStartDate, setOnboardingStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/create-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email,
        department,
        birthdate: birthdate || null,
        onboarding_start_date: onboardingStartDate,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create employee");
      return;
    }

    setResult(data);
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">Employee created</h1>
        <p className="mb-4 text-sm text-slate-500">
          Share these credentials with the employee. The password is shown only once.
        </p>
        <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm">
          <div>
            <span className="text-slate-500">Email: </span>
            <span className="font-mono">{result.email}</span>
          </div>
          <div>
            <span className="text-slate-500">Temp password: </span>
            <span className="font-mono">{result.tempPassword}</span>
          </div>
        </div>
        <Link href="/admin/employees" className="text-sm font-medium text-slate-900 hover:underline">
          Back to employee list
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-1 flex items-start gap-2">
        <BackButton />
        <h1 className="text-xl font-semibold text-slate-900">New employee</h1>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Creates their login with a temporary password generated for you to share
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Full name<span className="text-red-500">*</span>
          </label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Email<span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Department<span className="text-red-500">*</span>
          </label>
          <select
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="" disabled>
              Select a department
            </option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Probation started<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={onboardingStartDate}
            onChange={(e) => setOnboardingStartDate(e.target.value)}
            className={FIELD_CLASS}
          />
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

        <p className="text-xs text-slate-400">
          <span className="text-red-500">*</span> Required fields
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading && <Spinner />}
          {loading ? "Creating..." : "Create employee"}
        </button>
      </form>
    </div>
  );
}
