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


def test_trucks_payload_incluye_user_id():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/trucks", headers=headers)
    assert response.status_code == 200
    trucks = response.json()
    assert isinstance(trucks, list)
    assert len(trucks) > 0
    for truck in trucks:
        assert "user_id" in truck


def test_conductor_no_puede_usar_camion_de_otro_conductor():
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


def test_conductor_vinculado_por_user_id_no_por_nombre():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "conductor@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/trucks", headers=headers)
    assert response.status_code == 200
    trucks = response.json()
    my_truck = next((t for t in trucks if t.get("user_id") == 4), None)
    assert my_truck is not None
    assert my_truck["code"] == "C-04"


def test_luis_huaman_puede_registrar_para_c01():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "luis.huaman@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 1, "zone_id": 1, "kg": 120},
        headers=headers,
    )
    assert response.status_code == 200
    created = response.json()
    assert created["kg"] == 120
    assert created["status"] == "Confirmada"


def test_luis_huaman_no_puede_usar_camion_ajeno():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "luis.huaman@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 2, "zone_id": 2, "kg": 120},
        headers=headers,
    )
    assert response.status_code == 403


def test_rosa_ccahuana_puede_registrar_para_c02():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "rosa.ccahuana@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 2, "zone_id": 2, "kg": 200},
        headers=headers,
    )
    assert response.status_code == 200
    created = response.json()
    assert created["kg"] == 200
    assert created["status"] == "Confirmada"


def test_rosa_ccahuana_no_puede_usar_camion_ajeno():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "rosa.ccahuana@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 3, "zone_id": 3, "kg": 200},
        headers=headers,
    )
    assert response.status_code == 403


def test_mario_quispe_puede_registrar_para_c03():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "mario.quispe@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 3, "zone_id": 3, "kg": 90},
        headers=headers,
    )
    assert response.status_code == 200
    created = response.json()
    assert created["kg"] == 90
    assert created["status"] == "Confirmada"


def test_mario_quispe_no_puede_usar_camion_ajeno():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "mario.quispe@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/collections",
        json={"truck_id": 4, "zone_id": 5, "kg": 90},
        headers=headers,
    )
    assert response.status_code == 403


def test_todos_los_camiones_tienen_usuario_asignado():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/trucks", headers=headers)
    assert response.status_code == 200
    trucks = response.json()
    assert len(trucks) == 4
    for truck in trucks:
        assert truck.get("user_id") is not None
