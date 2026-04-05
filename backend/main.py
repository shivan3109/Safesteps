from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import random
import math
import requests

app = FastAPI(title="SafeSteps Route Generator")

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
if not GOOGLE_MAPS_API_KEY:
    raise RuntimeError("Missing GOOGLE_MAPS_API_KEY environment variable")

DANGER_ZONES = [
    {"lat": 10.660, "lng": -61.510, "severity": 3},
    {"lat": 10.662, "lng": -61.508, "severity": 5},
    {"lat": 10.658, "lng": -61.512, "severity": 2},
]


class LatLng(BaseModel):
    lat: float
    lng: float


class SafeRouteRequest(BaseModel):
    origin: LatLng
    destination: Optional[str] = None
    distance_km: Optional[float] = Field(None, gt=0)


class SafeRouteOption(BaseModel):
    polyline: str
    distance: str
    risk_score: float
    is_safest: bool


class SafeRouteResponse(BaseModel):
    routes: List[SafeRouteOption]


def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def score_route(polyline: str, distance_km: float) -> float:
    points = decode_polyline(polyline)
    risk_score = 0.0
    for point in points:
        for danger in DANGER_ZONES:
            distance_m = haversine_distance_meters(point[0], point[1], danger["lat"], danger["lng"])
            if distance_m <= 150:
                risk_score += danger["severity"]
    risk_score += distance_km * 0.1
    return round(risk_score, 2)


def decode_polyline(encoded: str) -> List[List[float]]:
    points: List[List[float]] = []
    index = 0
    lat = 0
    lng = 0

    while index < len(encoded):
        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        shift = 0
        result = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng

        points.append([lat / 1e5, lng / 1e5])

    return points


def build_google_directions_request(params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "origin": params["origin"],
        "destination": params["destination"],
        "mode": params.get("mode", "walking"),
        "alternatives": str(params.get("alternatives", True)).lower(),
        "key": GOOGLE_MAPS_API_KEY,
        **({"waypoints": params["waypoints"]} if "waypoints" in params else {}),
    }


def fetch_routes(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    url = "https://maps.googleapis.com/maps/api/directions/json"
    response = requests.get(url, params=build_google_directions_request(params), timeout=15)
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Google Directions request failed")

    body = response.json()
    if body.get("status") != "OK":
        raise HTTPException(status_code=502, detail=f"Google Directions error: {body.get('status')}")

    return body.get("routes", [])


def route_distance_km(route: Dict[str, Any]) -> float:
    total = 0
    for leg in route.get("legs", []):
        total += leg.get("distance", {}).get("value", 0)
    return round(total / 1000.0, 2)


def build_safe_options(routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    options = []
    for route in routes:
        polyline = route.get("overview_polyline", {}).get("points", "")
        distance_km = route_distance_km(route)
        options.append(
            {
                "polyline": polyline,
                "distance": f"{distance_km} km",
                "risk_score": score_route(polyline, distance_km),
                "is_safest": False,
            }
        )
    if options:
        safest = min(options, key=lambda item: item["risk_score"])
        for option in options:
            option["is_safest"] = option is safest
    return options


def random_waypoint(origin: LatLng, radius_km: float) -> LatLng:
    bearing = random.random() * 2 * math.pi
    distance_m = random.uniform(radius_km * 500, radius_km * 1000)
    earth_radius = 6371000.0
    lat1 = math.radians(origin.lat)
    lng1 = math.radians(origin.lng)
    lat2 = math.asin(
        math.sin(lat1) * math.cos(distance_m / earth_radius)
        + math.cos(lat1) * math.sin(distance_m / earth_radius) * math.cos(bearing)
    )
    lng2 = lng1 + math.atan2(
        math.sin(bearing) * math.sin(distance_m / earth_radius) * math.cos(lat1),
        math.cos(distance_m / earth_radius) - math.sin(lat1) * math.sin(lat2),
    )
    return LatLng(lat=math.degrees(lat2), lng=math.degrees(lng2))


@app.post("/generate-safe-route", response_model=SafeRouteResponse)
def generate_safe_route(request: SafeRouteRequest):
    if not request.destination and not request.distance_km:
        raise HTTPException(status_code=400, detail="Either destination or distance_km is required")

    origin_param = f"{request.origin.lat},{request.origin.lng}"
    routes: List[Dict[str, Any]] = []

    if request.destination:
        routes_data = fetch_routes(
            {
                "origin": origin_param,
                "destination": request.destination,
                "alternatives": True,
                "mode": "walking",
            }
        )
        routes = build_safe_options(routes_data)
    else:
        distance_km = round(request.distance_km or 0, 2)
        radius_km = max(0.5, min(distance_km / 2, 3.0))
        generated: List[Dict[str, Any]] = []
        for _ in range(3):
            waypoint_a = random_waypoint(request.origin, radius_km)
            waypoint_b = random_waypoint(request.origin, radius_km)
            waypoint_param = f"via:{waypoint_a.lat},{waypoint_a.lng}|via:{waypoint_b.lat},{waypoint_b.lng}"
            try:
                candidate_routes = fetch_routes(
                    {
                        "origin": origin_param,
                        "destination": origin_param,
                        "waypoints": waypoint_param,
                        "mode": "walking",
                        "alternatives": False,
                    }
                )
            except HTTPException:
                continue
            generated.extend(candidate_routes[:1])

        if not generated:
            raise HTTPException(status_code=502, detail="Unable to generate loop routes")
        routes = build_safe_options(generated)

    if not routes:
        raise HTTPException(status_code=502, detail="No routes returned")

    return {"routes": routes}
