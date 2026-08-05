import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app, haversine_distance_m, build_proximity_alerts
from fastapi.testclient import TestClient


def test_haversine_distance_known_points():
    distance = haversine_distance_m(-13.5166, -71.9789, -13.5256, -71.9558)
    assert 2500 < distance < 3000


def test_haversine_same_point():
    distance = haversine_distance_m(-13.5166, -71.9789, -13.5166, -71.9789)
    assert distance == 0.0


def test_proximity_alerts_citizen_nearby_truck():
    trucks = [
        {"id": 1, "code": "C-01", "driver": "Luis Huaman", "status": "En ruta", "zone": "Centro Historico", "latitude": -13.5166, "longitude": -71.9789},
        {"id": 2, "code": "C-02", "driver": "Rosa Ccahuana", "status": "Mantenimiento", "zone": "Wanchaq", "latitude": -13.5256, "longitude": -71.9558},
    ]
    zones = [
        {"id": 1, "name": "Centro Historico", "latitude": -13.5166, "longitude": -71.9789, "criticality": "Alta"},
        {"id": 2, "name": "Wanchaq", "latitude": -13.5256, "longitude": -71.9558, "criticality": "Alta"},
    ]
    routes = [
        {"id": 1, "truck": "C-01", "zone": "Centro Historico", "progress": 86, "eta": "5 min", "delay": "Sin retraso", "latitude": -13.5166, "longitude": -71.9789},
    ]
    current_user = {"id": 2, "name": "Ciudadano Demo", "email": "ciudadano@ecocusco.pe", "role": "ciudadano", "zone": "Centro Historico"}
    notifications = []
    alerts = build_proximity_alerts(current_user, trucks, zones, routes, notifications)
    assert len(alerts) == 1
    assert alerts[0]["truck_code"] == "C-01"
    assert alerts[0]["type"] == "proximity"


def test_proximity_alerts_no_nearby_trucks():
    trucks = [
        {"id": 1, "code": "C-01", "driver": "Luis Huaman", "status": "En ruta", "zone": "Wanchaq", "latitude": -13.5256, "longitude": -71.9558},
    ]
    zones = [
        {"id": 1, "name": "Centro Historico", "latitude": -13.5166, "longitude": -71.9789, "criticality": "Alta"},
    ]
    routes = [
        {"id": 1, "truck": "C-01", "zone": "Wanchaq", "progress": 86, "eta": "5 min", "delay": "Sin retraso", "latitude": -13.5256, "longitude": -71.9558},
    ]
    current_user = {"id": 2, "name": "Ciudadano Demo", "email": "ciudadano@ecocusco.pe", "role": "ciudadano", "zone": "Centro Historico"}
    notifications = []
    alerts = build_proximity_alerts(current_user, trucks, zones, routes, notifications)
    assert len(alerts) == 0


def test_proximity_check_endpoint():
    client = TestClient(app)
    login_response = client.post("/api/auth/login", json={"email": "ciudadano@ecocusco.pe", "password": "Test12345!"})
    assert login_response.status_code == 200
    token = login_response.json()["token"]
    response = client.post("/api/proximity/check", json={"latitude": -13.5166, "longitude": -71.9789, "radius_m": 500}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    payload = response.json()
    assert "nearby" in payload
    assert isinstance(payload["nearby"], list)


def test_proximity_check_endpoint_requires_auth():
    client = TestClient(app)
    response = client.post("/api/proximity/check", json={"latitude": -13.5166, "longitude": -71.9789, "radius_m": 500})
    assert response.status_code == 401


def test_monitor_includes_proximity_alerts():
    client = TestClient(app)
    response = client.get("/api/operations/monitor")
    assert response.status_code == 200
    payload = response.json()
    assert "notifications" in payload
    assert isinstance(payload["notifications"], list)


def test_alerts_endpoint_includes_proximity():
    client = TestClient(app)
    response = client.get("/api/alerts")
    assert response.status_code == 200
    payload = response.json()
    assert "alerts" in payload
    assert isinstance(payload["alerts"], list)
