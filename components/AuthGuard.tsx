"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        router.replace("/login");
      } else {
        setChecking(false);
      }
    };

    checkSession();
    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium shadow-sm">
          Checking authentication...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}