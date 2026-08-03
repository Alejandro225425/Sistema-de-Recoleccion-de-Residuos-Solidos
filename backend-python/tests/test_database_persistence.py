"""Tests de integración para persistencia en PostgreSQL.

Estos tests verifican que las operaciones CRUD persisten en la base de datos
real (no en memoria) cuando DATABASE_URL está configurada. Se omiten
automáticamente si no hay una base de datos disponible.
"""
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if not os.getenv("DATABASE_URL"):
    pytest.skip("DATABASE_URL no configurada; se omiten tests de integración con PostgreSQL", allow_module_level=True)

from app.main import (  # noqa: E402
    app,
    execute_one,
    init_db,
    _resolve_sql_file,
)
import app.main as _main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


def test_resolve_sql_file_encuentra_schema_y_seed():
    assert _resolve_sql_file("schema.sql") is not None
    assert _resolve_sql_file("seed.sql") is not None


def test_init_db_crea_esquema_y_carga_semilla():
    assert init_db() is True
    assert _main.DB_CONNECTED is True
    result = execute_one("SELECT to_regclass('public.users') AS tbl", ())
    assert result["tbl"] is not None
    counts = execute_one("SELECT COUNT(*) AS cnt FROM users", ())
    assert counts["cnt"] >= 1


def test_execute_one_maneja_update_sin_returning():
    """execute_one debe retornar {} para UPDATE sin RETURNING (no lanzar 404)."""
    init_db()
    client = TestClient(app)
    token = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    zone = client.post("/api/zones", json={"name": "Zona Test Exec", "latitude": -13.5, "longitude": -71.98, "criticality": "Alta"}, headers=headers).json()
    zone_id = zone["id"]
    try:
        result = execute_one("UPDATE zones SET criticality = %s WHERE id = %s", ("Baja", zone_id))
        assert result == {}
        row = execute_one("SELECT criticality FROM zones WHERE id = %s", (zone_id,))
        assert row["criticality"] == "Baja"
    finally:
        client.delete(f"/api/zones/{zone_id}", headers=headers)


def test_crud_completo_persiste_en_base_de_datos():
    init_db()
    client = TestClient(app)
    token = client.post("/api/auth/login", json={"email": "admin@ecocusco.pe", "password": "admin123"}).json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    zone = client.post("/api/zones", json={"name": "Zona Persistencia", "latitude": -13.5, "longitude": -71.98, "criticality": "Alta"}, headers=headers).json()
    assert zone["name"] == "Zona Persistencia"
    zone_id = zone["id"]

    row = execute_one("SELECT name, criticality FROM zones WHERE id = %s", (zone_id,))
    assert row["name"] == "Zona Persistencia"
    assert row["criticality"] == "Alta"

    client.patch(f"/api/zones/{zone_id}", json={"criticality": "Baja"}, headers=headers)
    row = execute_one("SELECT criticality FROM zones WHERE id = %s", (zone_id,))
    assert row["criticality"] == "Baja"

    client.delete(f"/api/zones/{zone_id}", headers=headers)
    count = execute_one("SELECT COUNT(*) AS cnt FROM zones WHERE id = %s", (zone_id,))
    assert count["cnt"] == 0


def test_health_reporta_conectado():
    init_db()
    payload = TestClient(app).get("/api/health").json()
    assert payload["connected"] is True
    assert payload["mode"] == "production"
    assert payload["database"] == "postgresql"
