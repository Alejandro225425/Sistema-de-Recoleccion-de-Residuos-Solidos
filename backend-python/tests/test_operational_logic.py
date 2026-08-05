import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app, build_alerts, simulate_truck_positions
from fastapi.testclient import TestClient


def test_health_endpoint_reports_ok():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["version"] == "5.5.4"
    assert payload["database"] in {"memory", "postgresql", "memory (psycopg no instalado)"}
    assert payload["mode"] in {"demo", "production"}


def test_build_alerts_detects_full_containers_and_delays():
    routes = [{"id": 1, "truck": "C-04", "zone": "Santiago", "progress": 25, "eta": "28 min", "delay": "Sin retraso", "latitude": -13.5350, "longitude": -71.9847}]
    containers = [{"id": 1, "zone_id": 1, "name": "Contenedor 01", "fill_level": 92, "status": "Lleno"}]
    alerts = build_alerts(routes=routes, containers=containers)
    assert any("Contenedor 01" in alert for alert in alerts)
    assert any("retraso" in alert.lower() for alert in alerts)


def test_simulate_truck_positions_changes_coordinates():
    routes = [{"id": 1, "truck": "C-01", "zone": "Centro Historico", "progress": 80, "eta": "5 min", "delay": "Sin retraso", "latitude": -13.5166, "longitude": -71.9789}]
    positions = simulate_truck_positions(routes)
    assert positions[0]["code"] == "C-01"
    assert positions[0]["latitude"] != routes[0]["latitude"]
    assert positions[0]["longitude"] != routes[0]["longitude"]


def test_update_operation_route_event_requires_auth_and_updates_monitor():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]

    response = client.post(
        "/api/operations/update",
        json={"type": "route_update", "id": 1, "progress": 70, "delay": "Retraso leve"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "truck_assignments" in payload
    assert "performance" in payload
    assert payload["performance"]["delayed_routes"] >= 1


def test_update_operation_container_event_requires_auth_and_updates_monitor():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]

    response = client.post(
        "/api/operations/update",
        json={"type": "container_update", "id": 1, "fill_level": 95, "status": "Lleno"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "containers" in payload
    assert any(container["id"] == 1 and container["fill_level"] == 95 for container in payload["containers"])
    assert payload["notifications"] and any(
        isinstance(note, dict) and ("Contenedor 1 actualizado" in note.get("message", "") or "Lleno" in note.get("message", ""))
        for note in payload["notifications"]
    )


def test_conductor_track_location_generates_proximity_notification():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "conductor@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]

    response = client.post(
        "/api/operations/track-location",
        json={"truck_id": 4, "latitude": -13.5350, "longitude": -71.9847},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["thresholdMeters"] == 150
    assert payload["message"] == "El camión C-04 está a 0 m de la zona Santiago. Llegará aproximadamente en 28 min."

    monitor = client.get("/api/operations/monitor")
    assert monitor.status_code == 200
    monitor_payload = monitor.json()
    assert any(
        isinstance(note, dict) and note.get("type") == "proximity" and note.get("title") == "Aviso de proximidad"
        for note in monitor_payload.get("notifications", [])
    )


def test_e2e_route_update_persists_to_routes_and_monitor():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]

    response = client.post(
        "/api/operations/update",
        json={"type": "route_update", "id": 1, "progress": 70, "delay": "Retraso leve"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["performance"]["delayed_routes"] >= 1
    assert any(
        isinstance(note, dict) and "Ruta 1 actualizada" in note.get("message", "")
        for note in payload["notifications"]
    )

    monitor = client.get("/api/operations/monitor")
    assert monitor.status_code == 200
    monitor_payload = monitor.json()
    assert monitor_payload["performance"]["delayed_routes"] >= 1

    routes = client.get("/api/routes")
    assert routes.status_code == 200
    assert any(route["id"] == 1 and route["progress"] == 70 and route["delay"] == "Retraso leve" for route in routes.json())


def test_e2e_container_update_persists_to_containers_and_monitor():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]

    response = client.post(
        "/api/operations/update",
        json={"type": "container_update", "id": 1, "fill_level": 95, "status": "Lleno"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert any(
        isinstance(note, dict) and "Contenedor 1 actualizado" in note.get("message", "")
        for note in payload["notifications"]
    )
    assert any(container["id"] == 1 and container["fill_level"] == 95 for container in payload["containers"])

    monitor = client.get("/api/operations/monitor")
    assert monitor.status_code == 200
    monitor_payload = monitor.json()
    assert any(container["id"] == 1 for container in monitor_payload["containers"])
    assert any(container["id"] == 1 and container["fill_level"] >= 95 for container in monitor_payload["containers"])

    bootstrap_data = client.get("/api/bootstrap")
    assert bootstrap_data.status_code == 200
    assert any(container["id"] == 1 and container["fill_level"] == 95 for container in bootstrap_data.json()["containers"])


def test_password_reset_flow_uses_database_tokens(monkeypatch):
    calls: list[tuple[str, tuple]] = []

    def fake_execute(query: str, params: tuple = ()) -> dict | None:
        calls.append((query, params))
        if "from users where email = %s" in query:
            return {
                "id": 1,
                "name": "Administrador EcoCusco",
                "email": "admin@ecocusco.pe",
                "role": "admin",
                "zone": "Centro Historico",
                "password_hash": "$2b$12$8bI9mP5xQK4zbln0L7hmuO4kx2Q2dM2s1nS0H3x9qYdY/7eUVp7oG",
                "created_at": "2026-01-01T00:00:00+00:00",
            }
        if "insert into password_reset_tokens" in query:
            return {"id": 1, "email": params[0], "token": params[1], "expires_at": params[2]}
        if "select id, email, token" in query:
            return {"id": 1, "email": "admin@ecocusco.pe", "token": params[0], "expires_at": "2099-01-01T00:00:00+00:00"}
        if "delete from password_reset_tokens" in query:
            return {"id": 1}
        if "update users set password_hash" in query:
            return {"id": 1}
        return None

    monkeypatch.setattr("app.main.execute_one", fake_execute)

    client = TestClient(app)
    forgot_response = client.post("/api/auth/forgot-password", json={"email": "admin@ecocusco.pe"})
    assert forgot_response.status_code == 200
    token = forgot_response.json()["token"]
    assert token

    reset_response = client.post("/api/auth/reset-password", json={"token": token, "password": "newPassword123"})
    assert reset_response.status_code == 200

    assert any("insert into password_reset_tokens" in query for query, _ in calls)
    assert any("delete from password_reset_tokens" in query for query, _ in calls)


def test_admin_crud_endpoints_for_trucks_zones_schedules_and_maintenance():
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    zone_response = client.post("/api/zones", json={"name": "Zona CRUD", "latitude": -13.52, "longitude": -71.97, "criticality": "Media"}, headers=headers)
    assert zone_response.status_code == 200
    zone = zone_response.json()
    assert zone["name"] == "Zona CRUD"

    truck_response = client.post("/api/trucks", json={"code": "C-CRUD", "driver": "Juan Perez", "status": "En ruta", "zone_id": zone["id"], "latitude": -13.52, "longitude": -71.97}, headers=headers)
    assert truck_response.status_code == 200
    truck = truck_response.json()
    assert truck["code"] == "C-CRUD"

    schedule_response = client.post("/api/schedules", json={"zone_id": zone["id"], "day": "Domingo", "time": "09:00", "waste": "Reciclable"}, headers=headers)
    assert schedule_response.status_code == 200
    schedule = schedule_response.json()
    assert schedule["zone_id"] == zone["id"]

    maintenance_response = client.post("/api/maintenance", json={"truck_id": truck["id"], "description": "Cambio de aceite", "status": "Pendiente"}, headers=headers)
    assert maintenance_response.status_code == 200
    maintenance = maintenance_response.json()
    assert maintenance["truck_id"] == truck["id"]

    patch_zone = client.patch(f"/api/zones/{zone['id']}", json={"criticality": "Alta"}, headers=headers)
    assert patch_zone.status_code == 200
    assert patch_zone.json()["criticality"] == "Alta"

    patch_truck = client.patch(f"/api/trucks/{truck['id']}", json={"status": "Mantenimiento"}, headers=headers)
    assert patch_truck.status_code == 200
    assert patch_truck.json()["status"] == "Mantenimiento"

    patch_schedule = client.patch(f"/api/schedules/{schedule['id']}", json={"day": "Lunes"}, headers=headers)
    assert patch_schedule.status_code == 200
    assert patch_schedule.json()["day"] == "Lunes"

    patch_maintenance = client.patch(f"/api/maintenance/{maintenance['id']}", json={"status": "Completado"}, headers=headers)
    assert patch_maintenance.status_code == 200
    assert patch_maintenance.json()["status"] == "Completado"

    delete_response = client.delete(f"/api/maintenance/{maintenance['id']}", headers=headers)
    assert delete_response.status_code == 200
    delete_schedule = client.delete(f"/api/schedules/{schedule['id']}", headers=headers)
    assert delete_schedule.status_code == 200
    delete_truck = client.delete(f"/api/trucks/{truck['id']}", headers=headers)
    assert delete_truck.status_code == 200
    delete_zone = client.delete(f"/api/zones/{zone['id']}", headers=headers)
    assert delete_zone.status_code == 200


def test_login_nonexistent_email_returns_401_same_message():
    """Timing attack mitigation: non-existent email returns 401 with same message as wrong password."""
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"email": "nonexistent@ecocusco.pe", "password": "wrong-password-123"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"


def test_login_wrong_password_returns_401():
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "wrong-password-123"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Credenciales inválidas"


def test_login_correct_password_returns_token():
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["token"]
    assert payload["user"]["email"] == "admin@ecocusco.pe"
    assert payload["user"]["role"] == "admin"


def test_login_password_with_spaces_not_stripped():
    """Password with leading/trailing spaces must reach backend without stripping."""
    client = TestClient(app)
    admin_password = "admin123"
    response = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": f" {admin_password} "})
    assert response.status_code == 401


def test_bulk_action_deletes_zones_schedules_and_maintenance_as_admin():
    """Operaciones masivas: elimina múltiples zonas, horarios y mantenimientos en una sola petición."""
    from app.main import memory

    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    zone_response = client.post("/api/zones", json={"name": "Zona Bulk 1", "latitude": -13.52, "longitude": -71.97, "criticality": "Media"}, headers=headers)
    zone_a = zone_response.json()
    zone_response2 = client.post("/api/zones", json={"name": "Zona Bulk 2", "latitude": -13.53, "longitude": -71.98, "criticality": "Baja"}, headers=headers)
    zone_b = zone_response2.json()

    truck_response = client.post("/api/trucks", json={"code": "C-BULK", "driver": "Test Driver", "status": "En ruta", "zone_id": zone_a["id"], "latitude": -13.52, "longitude": -71.97}, headers=headers)
    truck = truck_response.json()

    schedule_response = client.post("/api/schedules", json={"zone_id": zone_a["id"], "day": "Lunes", "time": "08:00", "waste": "Orgánico"}, headers=headers)
    schedule = schedule_response.json()

    maintenance_response = client.post("/api/maintenance", json={"truck_id": truck["id"], "description": "Filtro de aceite", "status": "Pendiente"}, headers=headers)
    maintenance = maintenance_response.json()

    ids_zones = [zone_a["id"], zone_b["id"]]
    response = client.post("/api/admin/bulk-action", json={"resource": "zones", "action": "delete", "ids": ids_zones}, headers=headers)
    assert response.status_code == 200
    result = response.json()
    assert result["count"] == 2
    assert set(result["deleted"]) == set(ids_zones)
    remaining_zone_ids = [z["id"] for z in memory.zones]
    for zid in ids_zones:
        assert zid not in remaining_zone_ids

    response = client.post("/api/admin/bulk-action", json={"resource": "schedules", "action": "delete", "ids": [schedule["id"]]}, headers=headers)
    assert response.status_code == 200
    assert response.json()["count"] == 1

    response = client.post("/api/admin/bulk-action", json={"resource": "maintenance", "action": "delete", "ids": [maintenance["id"]]}, headers=headers)
    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_bulk_action_empty_ids_returns_400():
    """Operaciones masivas: enviar lista vacía de IDs debe retornar error 400."""
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/admin/bulk-action", json={"resource": "zones", "action": "delete", "ids": []}, headers=headers)
    assert response.status_code == 400


def test_bulk_action_unsupported_resource_returns_400():
    """Operaciones masivas: recurso no soportado debe retornar error 400."""
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"})
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/admin/bulk-action", json={"resource": "unknown", "action": "delete", "ids": [1, 2]}, headers=headers)
    assert response.status_code == 400


def test_bulk_action_requires_admin_role():
    """Operaciones masivas: ciudadano no autorizado debe recibir 403."""
    client = TestClient(app)
    login = client.post("/api/auth/login", json={"email": "ciudadano@ecocusco.pe", "password": "Test12345!"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/api/admin/bulk-action", json={"resource": "zones", "action": "delete", "ids": [1]}, headers=headers)
    assert response.status_code == 403
