"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Create your SafeSteps account</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSignup}>
          <label className="block">
            <span className="text-slate-600">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <label className="block">
            <span className="text-slate-600">Confirm Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-sky-700 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}