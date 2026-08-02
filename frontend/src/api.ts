export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const apiBase = import.meta.env.VITE_API_URL ?? "/api";
    const token = localStorage.getItem("sir-token");
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      },
      ...options
    });
    const contentType = response.headers.get("content-type");
    const payload = contentType && contentType.includes("application/json")
      ? await response.json()
      : await response.text().catch(() => "");
    if (!response.ok) {
      const detail = typeof payload === "object" && payload !== null ? (payload?.detail ?? payload?.message ?? response.statusText) : (payload || response.statusText);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("sir-token");
        localStorage.removeItem("sir-session");
      }
      throw new Error(detail || `Error API ${response.status}`);
    }
    return (typeof payload === "object" && payload !== null) ? payload as T : ({} as T);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`No se pudo conectar con el backend. Verifica que esté ejecutándose.`);
    }
    throw error;
  }
}
