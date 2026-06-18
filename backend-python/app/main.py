from __future__ import annotations

import os
from datetime import date, datetime
from typing import Any, Optional

try:
    import psycopg
    from psycopg.rows import dict_row
except Exception:  # pragma: no cover - allows demo mode before installing DB deps
    psycopg = None
    dict_row = None

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: str
    zone: str = Field(min_length=2, max_length=80)


class ReportCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    citizen: str = Field(min_length=2, max_length=120)
    zone: str = Field(min_length=2, max_length=80)
    type: str = Field(min_length=2, max_length=80)
    detail: str = Field(min_length=8, max_length=600)


class MemoryStore:
    def __init__(self) -> None:
        self.zones = [
            {"id": 1, "name": "Centro Historico", "latitude": -13.5166, "longitude": -71.9789, "criticality": "Alta"},
            {"id": 2, "name": "Wanchaq", "latitude": -13.5256, "longitude": -71.9558, "criticality": "Alta"},
            {"id": 3, "name": "San Sebastian", "latitude": -13.5309, "longitude": -71.9386, "criticality": "Media"},
            {"id": 4, "name": "San Jeronimo", "latitude": -13.5439, "longitude": -71.8889, "criticality": "Media"},
            {"id": 5, "name": "Santiago", "latitude": -13.5350, "longitude": -71.9847, "criticality": "Alta"},
        ]
        self.schedules = [
            {"id": 1, "zone": "Centro Historico", "day": "Lunes, miercoles y viernes", "time": "06:30 - 08:30", "waste": "Organico y reciclable"},
            {"id": 2, "zone": "Wanchaq", "day": "Martes, jueves y sabado", "time": "07:00 - 09:00", "waste": "No reciclable y reciclable"},
            {"id": 3, "zone": "San Sebastian", "day": "Lunes, jueves y sabado", "time": "05:30 - 07:30", "waste": "Organico"},
            {"id": 4, "zone": "San Jeronimo", "day": "Miercoles y sabado", "time": "08:00 - 10:00", "waste": "Mixto segregado"},
            {"id": 5, "zone": "Santiago", "day": "Martes y viernes", "time": "06:00 - 08:00", "waste": "Reciclable"},
        ]
        self.trucks = [
            {"id": 1, "code": "C-01", "driver": "Luis Huaman", "status": "En ruta", "zone": "Centro Historico", "latitude": -13.5166, "longitude": -71.9789},
            {"id": 2, "code": "C-02", "driver": "Rosa Ccahuana", "status": "En ruta", "zone": "Wanchaq", "latitude": -13.5256, "longitude": -71.9558},
            {"id": 3, "code": "C-03", "driver": "Mario Quispe", "status": "Mantenimiento", "zone": "San Sebastian", "latitude": -13.5309, "longitude": -71.9386},
        ]
        self.routes = [
            {"id": 1, "truck": "C-02", "zone": "Wanchaq", "progress": 62, "eta": "12 min", "delay": "Sin retraso", "latitude": -13.5256, "longitude": -71.9558},
            {"id": 2, "truck": "C-01", "zone": "Centro Historico", "progress": 86, "eta": "5 min", "delay": "Sin retraso", "latitude": -13.5166, "longitude": -71.9789},
            {"id": 3, "truck": "C-04", "zone": "Santiago", "progress": 31, "eta": "28 min", "delay": "Retraso moderado", "latitude": -13.5350, "longitude": -71.9847},
        ]
        self.reports = [
            {"id": 1, "citizen": "Ana Quispe", "zone": "Wanchaq", "type": "Acumulacion de basura", "detail": "Contenedor lleno cerca al mercado.", "status": "En revision"},
            {"id": 2, "citizen": "Jose Huaman", "zone": "Santiago", "type": "Retraso", "detail": "No paso el camion en el horario indicado.", "status": "Pendiente"},
        ]
        self.collections = [
            {"id": 1, "zone": "Centro Historico", "truck": "C-01", "kg": 420, "status": "Confirmada", "date": "2026-06-10"},
            {"id": 2, "zone": "Wanchaq", "truck": "C-02", "kg": 360, "status": "Confirmada", "date": "2026-06-10"},
            {"id": 3, "zone": "Santiago", "truck": "C-04", "kg": 210, "status": "Parcial", "date": "2026-06-09"},
        ]
        self.users: list[dict[str, Any]] = []

    def analytics(self) -> dict[str, Any]:
        return {
            "zones": len(self.zones),
            "active_trucks": len([truck for truck in self.trucks if truck["status"] == "En ruta"]),
            "open_reports": len([report for report in self.reports if report["status"] != "Resuelto"]),
            "confirmed_collections": len([collection for collection in self.collections if collection["status"] == "Confirmada"]),
            "total_kg": sum(collection["kg"] for collection in self.collections),
            "compliance": 87,
        }


def cors_origins() -> list[str]:
    return [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]


app = FastAPI(title="SIR Cusco API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


memory = MemoryStore()


def database_url() -> Optional[str]:
    return os.getenv("DATABASE_URL")


def database_mode() -> str:
    if database_url() and psycopg is not None:
        return "postgresql"
    if database_url() and psycopg is None:
        return "memory (psycopg no instalado)"
    return "memory"


def memory_payload() -> dict[str, Any]:
    return {
        "zones": memory.zones,
        "schedules": memory.schedules,
        "trucks": memory.trucks,
        "routes": memory.routes,
        "reports": memory.reports,
        "collections": memory.collections,
        "analytics": memory.analytics(),
    }


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    if not database_url() or psycopg is None:
        raise RuntimeError("PostgreSQL no disponible")
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return list(cur.fetchall())


def execute_one(query: str, params: tuple[Any, ...]) -> dict[str, Any]:
    if not database_url() or psycopg is None:
        raise RuntimeError("PostgreSQL no disponible")
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            conn.commit()
            if row is None:
                raise HTTPException(status_code=404, detail="Registro no encontrado")
            return dict(row)


def normalize_dates(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for row in rows:
        for key, value in list(row.items()):
            if isinstance(value, (date, datetime)):
                row[key] = value.isoformat()
    return rows


def analytics_from(rows: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    collections = rows["collections"]
    reports = rows["reports"]
    trucks = rows["trucks"]
    return {
        "zones": len(rows["zones"]),
        "active_trucks": len([truck for truck in trucks if truck["status"] == "En ruta"]),
        "open_reports": len([report for report in reports if report["status"] != "Resuelto"]),
        "confirmed_collections": len([collection for collection in collections if collection["status"] == "Confirmada"]),
        "total_kg": sum(collection["kg"] for collection in collections),
        "compliance": 87,
    }


def bootstrap() -> dict[str, Any]:
    try:
        rows = {
            "zones": fetch_all("select id, name, latitude, longitude, criticality from zones order by id"),
            "schedules": fetch_all("select s.id, z.name as zone, s.day, s.time, s.waste from schedules s join zones z on z.id = s.zone_id order by s.id"),
            "trucks": fetch_all("select t.id, t.code, t.driver, t.status, z.name as zone, t.latitude, t.longitude from trucks t join zones z on z.id = t.zone_id order by t.id"),
            "routes": fetch_all("select r.id, t.code as truck, z.name as zone, r.progress, r.eta, r.delay, r.latitude, r.longitude from routes r join trucks t on t.id = r.truck_id join zones z on z.id = r.zone_id order by r.id"),
            "reports": fetch_all("select id, citizen, zone, type, detail, status from reports order by id desc"),
            "collections": normalize_dates(fetch_all("select c.id, z.name as zone, t.code as truck, c.kg, c.status, c.date from collections c join zones z on z.id = c.zone_id join trucks t on t.id = c.truck_id order by c.date desc")),
        }
        rows["analytics"] = analytics_from(rows)
        return rows
    except Exception:
        return memory_payload()


@app.get("/api/health")
def health() -> dict[str, str]:
    db_status = database_mode()
    return {
        "status": "ok",
        "database": db_status,
        "version": "1.0.0",
        "mode": "production" if db_status == "postgresql" else "demo"
    }


@app.get("/api/bootstrap")
def get_bootstrap() -> dict[str, Any]:
    return bootstrap()


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    try:
        row = execute_one(
            """
            insert into users (name, email, role, zone)
            values (%s, %s, %s, %s)
            on conflict (email) do update set name = excluded.name, role = excluded.role, zone = excluded.zone
            returning id, name, email, role, zone
            """,
            (payload.name, payload.email, payload.role, payload.zone),
        )
        return {"ok": True, "session": row}
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        user = payload.model_dump()
        user["id"] = len(memory.users) + 1
        memory.users.append(user)
        return {"ok": True, "session": user}


@app.get("/api/zones")
def get_zones() -> list[dict[str, Any]]:
    return bootstrap()["zones"]


@app.get("/api/schedules")
def get_schedules() -> list[dict[str, Any]]:
    return bootstrap()["schedules"]


@app.get("/api/trucks")
def get_trucks() -> list[dict[str, Any]]:
    return bootstrap()["trucks"]


@app.get("/api/routes")
def get_routes() -> list[dict[str, Any]]:
    return bootstrap()["routes"]


@app.get("/api/reports")
def get_reports() -> list[dict[str, Any]]:
    return bootstrap()["reports"]


@app.post("/api/reports")
def create_report(payload: ReportCreate) -> dict[str, Any]:
    try:
        return execute_one(
            "insert into reports (citizen, zone, type, detail, status) values (%s, %s, %s, %s, 'Pendiente') returning id, citizen, zone, type, detail, status",
            (payload.citizen, payload.zone, payload.type, payload.detail),
        )
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        report = payload.model_dump()
        report["id"] = max([item["id"] for item in memory.reports], default=0) + 1
        report["status"] = "Pendiente"
        memory.reports.insert(0, report)
        return report


@app.patch("/api/reports/{report_id}/resolve")
def resolve_report(report_id: int) -> dict[str, Any]:
    try:
        return execute_one(
            "update reports set status = 'Resuelto' where id = %s returning id, citizen, zone, type, detail, status",
            (report_id,),
        )
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        for report in memory.reports:
            if report["id"] == report_id:
                report["status"] = "Resuelto"
                return report
        raise HTTPException(status_code=404, detail="Reporte no encontrado")


@app.get("/api/collections")
def get_collections() -> list[dict[str, Any]]:
    return bootstrap()["collections"]


@app.get("/api/analytics/summary")
def get_analytics() -> dict[str, Any]:
    return bootstrap()["analytics"]
