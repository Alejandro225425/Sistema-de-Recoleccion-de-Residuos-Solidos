import React, { useMemo } from "react";
import { Bootstrap, Monitor, Session } from "../types";
import { extractWasteTypes } from "../main";

function getWasteTag(waste: string): string {
  const lower = waste.toLowerCase();
  if (lower.includes("organico")) return "green";
  if (lower.includes("no reciclable")) return "red";
  if (lower.includes("reciclable")) return "blue";
  if (lower.includes("mixto")) return "yellow";
  return "";
}

interface WasteSectionProps {
  data: Bootstrap;
  monitor: Monitor;
  session: Session | null;
  compact?: boolean;
  onNavigateToWaste?: () => void;
}

function WasteSection({ data, monitor, session, compact = false, onNavigateToWaste }: WasteSectionProps) {
  const schedules = data.schedules ?? [];
  const containers = monitor.containers ?? data.containers ?? [];

  const wasteStats = useMemo(() => {
    const stats: Record<string, { count: number; zones: string[] }> = {};
    schedules.forEach(s => {
      const types = extractWasteTypes(s.waste);
      types.forEach(t => {
        if (!stats[t]) stats[t] = { count: 0, zones: [] };
        stats[t].count++;
        if (!stats[t].zones.includes(s.zone)) stats[t].zones.push(s.zone);
      });
    });
    return stats;
  }, [schedules]);

  const containerStats = useMemo(() => {
    const total = containers.length;
    const full = containers.filter(c => String(c.status).toLowerCase() === "lleno").length;
    const avgFill = total > 0 ? Math.round(containers.reduce((sum, c) => sum + (Number(c.fill_level) || 0), 0) / total) : 0;
    return { total, full, avgFill };
  }, [containers]);

  const upcomingCollections = useMemo(() => {
    return schedules.slice(0, 3);
  }, [schedules]);

  return (
    <div className="panel waste-section">
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">♻️</span>
          <div className="metric-content">
            <strong className="metric-value">{Object.keys(wasteStats).length}</strong>
            <span className="metric-label">Tipos de residuo</span>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">🗑️</span>
          <div className="metric-content">
            <strong className="metric-value">{containerStats.total}</strong>
            <span className="metric-label">Contenedores</span>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">🔴</span>
          <div className="metric-content">
            <strong className="metric-value">{containerStats.full}</strong>
            <span className="metric-label">Contenedores llenos</span>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">📊</span>
          <div className="metric-content">
            <strong className="metric-value">{containerStats.avgFill}%</strong>
            <span className="metric-label">Llenado promedio</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Próximas recolecciones</h3>
        {upcomingCollections.length === 0 ? (
          <p className="empty-state">No hay horarios programados.</p>
        ) : (
          <div className="list">
            {upcomingCollections.map(schedule => (
              <article className="item" key={schedule.id}>
                <div className="item-row">
                  <strong>{schedule.zone}</strong>
                  <span className={`tag ${getWasteTag(schedule.waste)}`}>{schedule.waste}</span>
                </div>
                <span>{schedule.day} · {schedule.time}</span>
              </article>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Estado de contenedores</h3>
        {containers.length === 0 ? (
          <p className="empty-state">No hay contenedores monitoreados.</p>
        ) : (
          <div className="list">
            {containers.slice(0, 5).map(container => (
              <article className="item" key={container.id}>
                <div className="item-row">
                  <strong>{container.name}</strong>
                  <span className={`tag ${String(container.status).toLowerCase() === "lleno" ? "red" : "blue"}`}>{container.status}</span>
                </div>
                <span>{container.fill_level}% lleno</span>
              </article>
            ))}
          </div>
        )}
      </div>

      {!compact && (
        <div style={{ marginTop: 16 }}>
          <h3>Guía de disposición</h3>
          <div className="list">
            <article className="item">
              <div className="item-row"><strong>🟢 Orgánicos</strong><span className="tag green">Compostaje</span></div>
              <p>Restos de comida, cáscaras, hojas y residuos biodegradables. Depositar en contenedor verde.</p>
            </article>
            <article className="item">
              <div className="item-row"><strong>🔵 Reciclables</strong><span className="tag blue">Reciclaje</span></div>
              <p>Papel, cartón, plástico limpio, vidrio y metales separados. Depositar en contenedor azul.</p>
            </article>
            <article className="item">
              <div className="item-row"><strong>🔴 No reciclables</strong><span className="tag red">Disposición final</span></div>
              <p>Papel higiénico, tecnopor contaminado, colillas y residuos sanitarios. Depositar en contenedor gris.</p>
            </article>
          </div>
        </div>
      )}

      {compact && onNavigateToWaste && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="export-btn" onClick={onNavigateToWaste}>
            Ver clasificación completa
          </button>
        </div>
      )}
    </div>
  );
}

export default WasteSection;
