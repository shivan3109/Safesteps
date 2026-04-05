"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
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
        <h1 className="text-center text-2xl font-bold">Login to SafeSteps</h1>
        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <label className="block">
            <span className="text-slate-600">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="you@example.com"
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
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link href="/signup" className="font-semibold text-sky-700 hover:underline">
            Signup
          </Link>
        </p>
      </div>
    </div>
  );
}