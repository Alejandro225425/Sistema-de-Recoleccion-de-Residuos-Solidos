import type { ProximityCheckRequest, ProximityCheckResponse } from "./types";

export function getApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured;
  return "/api";
}

export function getGeoBase(): string {
  const configured = import.meta.env.VITE_GEO_URL?.trim();
  if (configured) return configured;
  return "/geo";
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const apiBase = getApiBase();
    const token = localStorage.getItem("sir-token");
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.detail ?? payload?.message ?? response.statusText;
      throw new Error(detail || `Error API ${response.status}`);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`No se pudo conectar con el backend. Verifica que esté ejecutándose.`);
    }
    throw error;
  }
}

export async function proximityCheck(payload: { latitude: number; longitude: number; radius_m?: number }): Promise<ProximityCheckResponse> {
  return request<ProximityCheckResponse>("/proximity/check", {
    method: "POST",
    body: JSON.stringify({
      latitude: payload.latitude,
      longitude: payload.longitude,
      radius_m: payload.radius_m ?? 500,
    }),
  });
}
