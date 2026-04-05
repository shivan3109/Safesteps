"use client";

/// <reference lib="dom" />
import React from "react";
import { useMemo, useEffect, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { supabase } from "@/lib/supabase";
import HazardForm from "./HazardForm";
import { Hazard, ActivityPoint } from "@/types";
import { useRouter } from "next/navigation";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "440px",
};

const DEFAULT_CENTER = {
  lat: 37.7749,
  lng: -122.4194,
};

export default function RunTracker() {
  const [isTracking, setIsTracking] = useState(false);
  const [path, setPath] = useState<ActivityPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<ActivityPoint | null>(null);
  const [trackingStart, setTrackingStart] = useState<Date | null>(null);
  const [hazardDraft, setHazardDraft] = useState<ActivityPoint | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const center = useMemo(() => currentPosition || DEFAULT_CENTER, [currentPosition]);

  useEffect(() => {
    const supply = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
      } else {
        const location = await new Promise<ActivityPoint | null>((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true },
          );
        });
        if (location) setCurrentPosition(location);
      }
    };
    supply();
  }, [router]);

  // eslint-disable-next-line no-undef
  const updateLocation = (position: GeolocationPosition) => {
    const next = { lat: position.coords.latitude, lng: position.coords.longitude };
    setCurrentPosition(next);
    setPath((prev) => [...prev, next]);
  };

  const startRun = () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported by your browser.");
      return;
    }

    setPath([]);
    setHazards([]);
    setTrackingStart(new Date());
    setIsTracking(true);
    setStatus("Tracking started");

    const id = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => {
        console.error(err);
        setStatus("Failed to get location updates");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    setWatchId(id);
  };

  const stopRun = async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    const endTime = new Date();
    setIsTracking(false);

    if (!trackingStart) {
      setStatus("No tracking session found.");
      return;
    }

    if (path.length < 2) {
      setStatus("Not enough movement tracked to save activity");
      return;
    }

    setSaving(true);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session || sessionError) {
      setStatus("User session invalid. Please login again.");
      setSaving(false);
      router.push("/login");
      return;
    }

    const { error: activityError } = await supabase
      .from("activities")
      .insert({
        user_id: session.user.id,
        start_time: trackingStart,
        end_time: endTime,
        path,
        hazards,
      })
      .select();

    if (activityError) {
      setStatus("Failed to save activity: " + activityError.message);
    } else {
      setStatus("Run stopped and saved to history");
      setPath([]);
      setHazards([]);
      setTrackingStart(null);
    }
    setSaving(false);
  };

  // eslint-disable-next-line no-undef
  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setHazardDraft({
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    });
  };

  const submitHazard = async (hazardType: string, hazardComment: string) => {
    if (!currentPosition && !hazardDraft) {
      setStatus("Cannot place hazard without location.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStatus("Please log in to report hazards.");
      router.replace("/login");
      return;
    }

    const newHazard: Hazard = {
      id: crypto.randomUUID(),
      user_id: session.user.id,
      lat: hazardDraft?.lat ?? currentPosition?.lat ?? 0,
      lng: hazardDraft?.lng ?? currentPosition?.lng ?? 0,
      type: hazardType,
      note: hazardComment,
      reported_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("hazards").insert({
      user_id: newHazard.user_id,
      latitude: newHazard.lat,
      longitude: newHazard.lng,
      hazard_type: newHazard.type,
      note: newHazard.note,
      reported_at: newHazard.reported_at,
      activity_timestamp: new Date().toISOString(),
    });

    if (error) {
      setStatus("Failed to report hazard: " + error.message);
      return;
    }

    setHazards((prev) => [...prev, newHazard]);
    setHazardDraft(null);
    setStatus("Hazard reported successfully!");
  };

  if (loadError) {
    return <p>Failed to load Google Maps SDK. {loadError.message}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={isTracking ? stopRun : startRun}
          disabled={saving}
          className={`rounded-lg px-4 py-2 font-semibold text-white ${
            isTracking ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isTracking ? "Stop Tracking" : "Start Tracking"}
        </button>
        {status && <p className="text-sm text-slate-700">{status}</p>}
      </div>
      {!isLoaded ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          Loading map engine...
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={14}
          onClick={onMapClick}
        >
          {currentPosition && <Marker position={currentPosition} label="You" />}
          {hazardDraft && (
            <Marker position={hazardDraft} label="Draft Hazard" icon="http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" />
          )}
          {hazards.map((item) => (
            <Marker
              key={item.id}
              position={{ lat: item.lat, lng: item.lng }}
              label={item.type}
              icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            />
          ))}
          {path.length >= 2 && (
            <Polyline
              path={path}
              options={{
                strokeColor: "#1d4ed8",
                strokeOpacity: 0.85,
                strokeWeight: 5,
                clickable: false,
                editable: false,
                zIndex: 1,
              }}
            />
          )}
        </GoogleMap>
      )}
      <HazardForm onSubmit={submitHazard} onCancel={() => setHazardDraft(null)} draftLocation={hazardDraft} />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-slate-800">Current Track Info</h3>
        <p>Tracked points: {path.length}</p>
        <p>Created hazards: {hazards.length}</p>
      </div>
    </div>
  );
}