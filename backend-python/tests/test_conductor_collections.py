"""Tests para validaciones de permisos del rol Conductor."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from fastapi.testclient import TestClient


def test_conductor_puede_registrar_recoleccion_para_su_camion():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "conductor@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 4, "zone_id": 5, "kg": 150},
        headers=headers,
    )
    assert response.status_code == 200
    created = response.json()
    assert created["kg"] == 150
    assert created["status"] == "Confirmada"


def test_conductor_no_puede_registrar_recoleccion_para_camion_ajeno():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "conductor@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 1, "zone_id": 1, "kg": 100},
        headers=headers,
    )
    assert response.status_code == 403


def test_ciudadano_no_puede_registrar_recoleccion():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "ciudadano@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 1, "zone_id": 1, "kg": 100},
        headers=headers,
    )
    assert response.status_code == 403


def test_admin_puede_registrar_recoleccion_para_cualquier_camion():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 2, "zone_id": 2, "kg": 200},
        headers=headers,
    )
    assert response.status_code == 200


def test_conductor_ve_solo_colecciones_de_su_zona_en_analytics():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "conductor@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/analytics/summary", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert "compliance" in payload
    assert "total_kg" in payload
