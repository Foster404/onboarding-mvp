"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function NewEmployeePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
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
      body: JSON.stringify({ full_name: fullName, email, department }),
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
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
        <Link href="/admin" className="text-sm font-medium text-slate-900 hover:underline">
          Back to employee list
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">New employee</h1>
      <p className="mb-6 text-sm text-slate-500">
        Creates their login. A temporary password is generated for you to share.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Department</label>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create employee"}
        </button>
      </form>
    </div>
  );
}
