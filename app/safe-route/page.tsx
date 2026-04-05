import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import SafeRouteGenerator from "@/components/SafeRouteGenerator";

export default function SafeRoutePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <Header title="Safe Route Generator" />
        <main className="mx-auto max-w-6xl px-4 pb-12 pt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SafeRouteGenerator />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
