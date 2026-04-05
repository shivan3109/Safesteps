"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <button
      onClick={signOut}
      disabled={loading}
      className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Logout"}
    </button>
  );
}