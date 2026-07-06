"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";
import Logo from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4">
            <Logo />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
          <p className="text-sm text-slate-500">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-emerald-600">
              Check your inbox for a link to reset your password.
            </p>
            <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition-shadow focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-600/25 transition-all hover:shadow-lg hover:shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading && <Spinner />}
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <Link href="/login" className="text-center text-sm font-medium text-slate-500 hover:text-slate-700">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
