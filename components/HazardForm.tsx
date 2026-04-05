"use client";

import React from "react";
import { useState } from "react";
import { ActivityPoint } from "@/types";

type HazardFormProps = {
  draftLocation: ActivityPoint | null;
  onSubmit: (hazardType: string, hazardComment: string) => Promise<void>;
  onCancel: () => void;
};

export default function HazardForm({ draftLocation, onSubmit, onCancel }: HazardFormProps) {
  // eslint-disable-next-line no-unused-vars
  const [hazardType, setHazardType] = useState("Poor Lighting");
  // eslint-disable-next-line no-unused-vars
  const [hazardComment, setHazardComment] = useState("");
  const [saving, setSaving] = useState(false);

  if (!draftLocation) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
        Click on the map to place a hazard marker and open the report form.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-lg font-semibold text-slate-800">Report Hazard</h3>
      <p className="mb-3 text-sm text-slate-600">
        Latitude: {draftLocation.lat.toFixed(6)}, Longitude: {draftLocation.lng.toFixed(6)}
      </p>
      <div className="grid gap-3">
        <select
          value={hazardType}
          onChange={(e) => setHazardType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        >
          <option>Poor Lighting</option>
          <option>Unsafe Intersection</option>
          <option>High Traffic</option>
          <option>Isolated Area</option>
          <option>Other</option>
        </select>
        <textarea
          value={hazardComment}
          onChange={(e) => setHazardComment(e.target.value)}
          rows={2}
          placeholder="Add details to help others"
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setSaving(true);
              await onSubmit(hazardType, hazardComment.trim());
              setSaving(false);
              setHazardComment("");
            }}
            disabled={saving || !hazardComment.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Reporting..." : "Submit Hazard"}
          </button>
          <button
            onClick={onCancel}
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}