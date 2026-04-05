"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";

type Mode = "destination" | "distance";

type SafeRouteOption = {
  polyline: string;
  distance: string;
  risk_score: number;
  is_safest: boolean;
};

type RouteDisplay = SafeRouteOption & {
  path: google.maps.LatLngLiteral[];
};

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "520px",
};

const DEFAULT_CENTER = {
  lat: 37.7749,
  lng: -122.4194,
};

const decodePolyline = (encoded: string): google.maps.LatLngLiteral[] => {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
};

const getRouteColor = (route: RouteDisplay): string => {
  if (route.is_safest) return "#16a34a";
  if (route.risk_score <= 4) return "#eab308";
  return "#dc2626";
};

const summarizeLabels = (riskScore: number): string => {
  if (riskScore <= 4) return "Medium risk";
  if (riskScore <= 8) return "Caution";
  return "High risk";
};

export default function SafeRouteGenerator() {
  const [mode, setMode] = useState<Mode>("destination");
  const [destination, setDestination] = useState("");
  const [distanceKm, setDistanceKm] = useState(5);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [routes, setRoutes] = useState<RouteDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is unavailable in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setMessage("Unable to access your location. Please allow geolocation.");
      },
      { enableHighAccuracy: true },
    );
  }, []);

  const center = useMemo(() => origin || DEFAULT_CENTER, [origin]);

  const handleSubmit = async () => {
    setMessage(null);
    setLoading(true);
    setRoutes([]);

    if (!origin) {
      setMessage("Waiting for location. Grant access and try again.");
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = { origin };
    if (mode === "destination") {
      if (!destination.trim()) {
        setMessage("Enter a destination before searching.");
        setLoading(false);
        return;
      }
      payload.destination = destination.trim();
    } else {
      payload.distance_km = distanceKm;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/generate-safe-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Route generation failed");
      }

      const data = (await response.json()) as { routes: SafeRouteOption[] };
      const newRoutes = data.routes.map((route) => ({
        ...route,
        path: decodePolyline(route.polyline),
      }));

      setRoutes(newRoutes);
      setSelectedIndex(newRoutes.findIndex((route: RouteDisplay) => route.is_safest) || 0);
      setMessage("Routes generated. Review the safest option below.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate route.");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setMode("destination")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "destination" ? "bg-sky-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
          >
            Enter destination
          </button>
          <button
            onClick={() => setMode("distance")}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "distance" ? "bg-sky-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
          >
            Enter distance (km)
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          {mode === "destination" ? (
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Destination</span>
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Example: 123 Main St, London"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Distance goal (km)</span>
              <input
                type="number"
                min={1}
                max={20}
                value={distanceKm}
                onChange={(event) => setDistanceKm(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </label>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-2xl bg-sky-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Finding safest route..." : "Find Safest Route"}
          </button>
        </div>
        <p className="text-sm text-slate-600">
          {mode === "destination"
            ? "Compare safety-first route options to avoid dangerous areas."
            : "Create a loop run/walk route that begins and ends at your current location."}
        </p>
      </div>

      {message && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {!isLoaded ? (
            <div className="grid min-h-[420px] place-items-center text-slate-500">Loading map...</div>
          ) : (
            <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={center} zoom={13}>
              {origin && <Marker position={origin} label="You" />}
              {routes.map((route, index) => (
                <Polyline
                  key={index}
                  path={route.path}
                  options={{
                    strokeColor: getRouteColor(route),
                    strokeOpacity: route.is_safest ? 0.95 : 0.7,
                    strokeWeight: route.is_safest ? 6 : 4,
                  }}
                />
              ))}
            </GoogleMap>
          )}
        </div>

        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-2xl bg-sky-50 p-4">
            <p className="text-sm font-semibold text-slate-900">AI Recommended Safest Route</p>
            <p className="mt-2 text-sm text-slate-600">Green routes are safest. Yellow routes are moderate. Red routes should be avoided where possible.</p>
          </div>
          {routes.length === 0 ? (
            <p className="text-sm text-slate-600">No route options yet. Submit a destination or distance to begin.</p>
          ) : (
            <div className="space-y-3">
              {routes.map((route, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedIndex === index ? "border-sky-600 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">Route {index + 1}</span>
                    <span className="rounded-full px-2 py-1 text-[11px] font-semibold text-white" style={{ backgroundColor: getRouteColor(route) }}>
                      {route.is_safest ? "Safest" : summarizeLabels(route.risk_score)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Distance: {route.distance}</p>
                  <p className="mt-1 text-sm text-slate-600">Risk score: {route.risk_score}</p>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
