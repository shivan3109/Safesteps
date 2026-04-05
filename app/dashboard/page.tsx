import RunTracker from "@/components/RunTracker";
import ActivityHistory from "@/components/ActivityHistory";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Header title="Dashboard" />
        <main className="mx-auto max-w-6xl px-4 pb-12 pt-6">
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">Live Tracking</h2>
              <RunTracker />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">Recent Activity</h2>
              <ActivityHistory />
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}