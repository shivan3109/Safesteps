export type ActivityPoint = {
  lat: number;
  lng: number;
};

export type Hazard = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  type: string;
  note: string;
  reported_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  path: ActivityPoint[];
  hazards?: Hazard[];
  created_at: string;
};