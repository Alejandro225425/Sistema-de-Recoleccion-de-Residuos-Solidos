#!/usr/bin/env python3
"""Smoke test for proximity alerts against a running API.

Usage:
  python scripts/smoke_proximity_test.py --api https://sir-cusco-api.onrender.com/api --email conductor@ecocusco.pe --password Test12345!

It will login, POST a track-location for a sample truck, then GET the monitor endpoint
and check for a proximity notification.
"""
import argparse
import sys
import requests


def login(api_base: str, email: str, password: str) -> str | None:
    url = f"{api_base.rstrip('/')}/auth/login"
    r = requests.post(url, json={"email": email, "password": password})
    if r.status_code != 200:
        print("Login failed:", r.status_code, r.text)
        return None
    return r.json().get("token")


def track_location(api_base: str, token: str, truck_id: int, lat: float, lng: float) -> dict:
    url = f"{api_base.rstrip('/')}/operations/track-location"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"truck_id": truck_id, "latitude": lat, "longitude": lng}
    r = requests.post(url, json=payload, headers=headers)
    return {"status_code": r.status_code, "json": r.json() if r.content else {}}


def get_monitor(api_base: str, token: str) -> dict:
    url = f"{api_base.rstrip('/')}/operations/monitor"
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(url, headers=headers)
    return {"status_code": r.status_code, "json": r.json() if r.content else {}}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", required=True, help="API base URL (eg https://.../api)")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--truck-id", type=int, default=4)
    parser.add_argument("--lat", type=float, default=-13.5350)
    parser.add_argument("--lng", type=float, default=-71.9847)
    args = parser.parse_args()

    token = login(args.api, args.email, args.password)
    if not token:
        return 2

    print("Posting location...")
    t = track_location(args.api, token, args.truck_id, args.lat, args.lng)
    print("track-location:", t["status_code"], t.get("json"))

    print("Fetching monitor payload...")
    m = get_monitor(args.api, token)
    print("monitor status:", m["status_code"])
    notifications = m.get("json", {}).get("notifications", [])
    print(f"Found {len(notifications)} notifications")
    found = any(n.get("type") == "proximity" or (n.get("title", "").lower().startswith("aviso de proximidad")) for n in notifications)
    print("Proximity notification present:", found)
    return 0 if found else 1


if __name__ == "__main__":
    raise SystemExit(main())
