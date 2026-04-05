"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity } from "@/types";

export default function ActivityHistory() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("User is not authenticated.");
        setLoading(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(15);

      if (dbError) {
        setError(dbError.message);
        setLoading(false);
        return;
      }

      setActivities(data ?? []);
      setLoading(false);
    };

    fetchActivities();
    const channel = supabase
      .channel('activities-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => fetchActivities())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (loading) {
    return <p className="text-slate-600">Loading history…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (activities.length === 0) {
    return <p className="text-slate-600">No runs saved yet. Start a run from the tracker!</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const duration = activity.end_time && activity.start_time ? new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime() : 0;
        const distance = activity.path.length * 0.0008; // approx ~78 cm per point (low fidelity)
        return (
          <article key={activity.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">
              {new Date(activity.start_time).toLocaleString()}
            </p>
            <p className="text-sm text-slate-600">
              Duration: {Math.max(0, Math.floor(duration / 60000))} min · Points: {activity.path.length} · Approx. {distance.toFixed(2)} km
            </p>
            {activity.hazards?.length ? (
              <p className="text-sm text-amber-700">
                Hazards: {activity.hazards.length}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No hazards reported</p>
            )}
          </article>
        );
      })}
    </div>
  );
}