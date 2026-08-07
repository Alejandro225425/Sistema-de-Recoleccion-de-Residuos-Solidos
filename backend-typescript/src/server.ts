import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3100);

const EARTH_RADIUS_M = 6_371_000;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dphi = toRad(lat2 - lat1);
  const dlambda = toRad(lon2 - lon1);
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_M * c * 10) / 10;
}

const trucks = [
  { code: "C-01", zone: "Centro Historico", latitude: -13.5166, longitude: -71.9789, progress: 86, etaMinutes: 5 },
  { code: "C-02", zone: "Wanchaq", latitude: -13.5256, longitude: -71.9558, progress: 62, etaMinutes: 12 },
  { code: "C-04", zone: "Santiago", latitude: -13.5350, longitude: -71.9847, progress: 31, etaMinutes: 28 }
];

function json(data: unknown, status = 200) {
  return {
    status,
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  };
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  let response: ReturnType<typeof json>;

  if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/health") {
    if (url.pathname === "/") {
      response = json({ service: "sir-cusco-geo", status: "ok", endpoints: ["/api/health", "/api/truck-locations", "/api/alerts", "/api/eta"] });
    } else {
      response = json({ status: "ok", service: "geo-alerts" });
    }
  } else if (url.pathname === "/truck-locations" || url.pathname === "/api/truck-locations") {
    response = json({ trucks });
  } else if (url.pathname === "/alerts" || url.pathname === "/api/alerts") {
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const radiusParam = Number(url.searchParams.get("radius_m"));
    const radiusM = Number.isFinite(radiusParam) && radiusParam > 0 ? radiusParam : 500;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const nearby = trucks
        .map(truck => ({
          ...truck,
          distance_m: haversineDistanceM(lat, lon, truck.latitude, truck.longitude),
        }))
        .filter(truck => truck.distance_m <= radiusM)
        .sort((a, b) => a.distance_m - b.distance_m)
        .map(truck => ({
          truck_code: truck.code,
          zone: truck.zone,
          distance_m: truck.distance_m,
          eta: `${truck.etaMinutes} min`,
          tone: truck.distance_m <= 200 ? "muy_cercano" : "cercano",
        }));
      response = json({ nearby });
    } else {
      response = json({
        alerts: trucks.map(truck => `${truck.code} llegara a ${truck.zone} en ${truck.etaMinutes} min`)
      });
    }
  } else if (url.pathname === "/eta" || url.pathname === "/api/eta") {
    const code = url.searchParams.get("truck");
    const truck = trucks.find(item => item.code === code) ?? trucks[0];
    response = json({ truck: truck.code, etaMinutes: truck.etaMinutes, eta: `${truck.etaMinutes} min` });
  } else {
    response = json({ error: "Ruta no encontrada" }, 404);
  }

  res.writeHead(response.status, response.headers);
  res.end(response.body);
});

server.listen(port, () => {
  console.log(`Servicio TS de geolocalizacion disponible en http://localhost:${port}`);
});
