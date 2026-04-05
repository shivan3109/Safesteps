import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-slate-900">
        SafeSteps
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Security-first running app for women. Live GPS tracking, route safety, and hazard reporting.
      </p>
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-center">
        <Link href="/login" className="rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700">
          Login
        </Link>
        <Link href="/signup" className="rounded-lg border border-sky-600 px-5 py-3 font-semibold text-sky-700 hover:bg-sky-50">
          Get Started
        </Link>
      </div>
      <div className="mt-12 space-y-4 text-left">
        <h2 className="text-2xl font-semibold">Features</h2>
        <ul className="list-disc pl-5 text-slate-700">
          <li>Live map with GPS tracking</li>
          <li>Start/stop run sessions</li>
          <li>Route drawing using polylines</li>
          <li>Hazard reporting (drop pin + form)</li>
          <li>Activity history saved in Supabase</li>
        </ul>
      </div>
    </main>
  );
}