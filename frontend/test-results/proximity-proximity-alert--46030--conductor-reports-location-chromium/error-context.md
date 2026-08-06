# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: proximity.spec.ts >> proximity alert appears for citizen after conductor reports location
- Location: e2e\proximity.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h4').filter({ hasText: 'Aviso de proximidad' }).first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('h4').filter({ hasText: 'Aviso de proximidad' }).first()

```

```yaml
- main:
  - link "Saltar al contenido principal":
    - /url: "#main-content"
  - complementary:
    - text: E
    - heading "EcoCusco" [level=1]
    - text: Gestión Ambiental
    - navigation:
      - button "🏠 Panel Principal"
      - button "📋 Reportes"
      - button "⏰ Horarios"
      - button "♻️ Clasificación"
      - button "📊 Estadísticas"
    - checkbox "Recibir avisos de proximidad" [checked]
    - text: Recibir avisos de proximidad
    - button "Cerrar sesión"
  - heading "Panel Principal" [level=2]
  - paragraph: 3 incidencias abiertas
  - strong: Ciudadano Demo
  - text: Ciudadano · Centro Historico · Alta
  - button "0 Reportes pendientes":
    - strong: "0"
    - text: Reportes pendientes
  - button "0 Recolecciones pendientes":
    - strong: "0"
    - text: Recolecciones pendientes
  - button "0 Reportes resueltos":
    - strong: "0"
    - text: Reportes resueltos
  - button "Centro Historico · Alta Mi zona":
    - strong: Centro Historico · Alta
    - text: Mi zona
  - button "0 Mis reportes":
    - strong: "0"
    - text: Mis reportes
  - text: ciudadano
  - heading "📍 Mi zona y seguimiento" [level=2]
  - strong: Centro Historico · Alta
  - paragraph: Tu zona cuenta con atención prioritaria y seguimiento del equipo municipal.
  - strong: Próximos pasos
  - paragraph: Todo en orden en tu zona. Sigue reportando incidencias para mejorar el servicio municipal.
  - heading "🧾 Mis reportes" [level=2]
  - paragraph: Aún no has enviado reportes. Puedes crear uno desde la vista de reportes.
  - heading "📋 Mis recolecciones" [level=2]
  - article:
    - strong: Centro Historico
    - text: Confirmada C-01 · 420 kg
    - paragraph: 2026-06-10
  - heading "💡 Recomendaciones del sistema" [level=2]
  - strong: Registra incidencias
  - paragraph: Reporta residuos, contenedores llenos o problemas de limpieza para recibir apoyo rápido.
  - strong: Revisa el estado
  - paragraph: Tu historial queda disponible para que puedas verificar qué se ha atendido y qué falta.
```

# Test source

```ts
  1  | import { test, expect, request } from '@playwright/test';
  2  | 
  3  | test('proximity alert appears for citizen after conductor reports location', async ({ browser }) => {
  4  |   const apiBase = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api';
  5  |   const frontendBase = process.env.E2E_FRONTEND_URL ?? 'http://127.0.0.1:5173';
  6  | 
  7  |   const api = await request.newContext();
  8  | 
  9  |   // Login as conductor and post a location near a zone to trigger proximity
  10 |   const loginRes = await api.post(`${apiBase}/auth/login`, { data: { email: 'conductor@ecocusco.pe', password: 'Test12345!' } });
  11 |   expect(loginRes.ok()).toBeTruthy();
  12 |   const loginJson = await loginRes.json();
  13 |   const conductorToken = loginJson.token;
  14 |   expect(conductorToken).toBeTruthy();
  15 | 
  16 |   const trackRes = await api.post(`${apiBase}/operations/track-location`, {
  17 |     headers: { Authorization: `Bearer ${conductorToken}` },
  18 |     data: { truck_id: 4, latitude: -13.5350, longitude: -71.9847 }
  19 |   });
  20 |   expect(trackRes.status()).toBeGreaterThanOrEqual(200);
  21 | 
  22 |   // Login as citizen to view dashboard
  23 |   const citizenLogin = await api.post(`${apiBase}/auth/login`, { data: { email: 'ciudadano@ecocusco.pe', password: 'Test12345!' } });
  24 |   expect(citizenLogin.ok()).toBeTruthy();
  25 |   const citizenJson = await citizenLogin.json();
  26 |   const citizenToken = citizenJson.token;
  27 |   const citizenUser = citizenJson.user;
  28 | 
  29 |   const context = await browser.newContext();
  30 |   const page = await context.newPage();
  31 |   await page.goto(frontendBase);
  32 | 
  33 |   // Initialize localStorage with session + token then reload so app picks it up
  34 |   await page.evaluate(({ user, token }) => {
  35 |     localStorage.setItem('sir-session', JSON.stringify(user));
  36 |     localStorage.setItem('sir-token', token);
  37 |   }, { user: citizenUser, token: citizenToken });
  38 |   await page.reload();
  39 | 
  40 |   // Wait for alerts section and look for proximity alert title
  41 |   const proximity = page.locator('h4', { hasText: 'Aviso de proximidad' }).first();
> 42 |   await expect(proximity).toBeVisible({ timeout: 8000 });
     |                           ^ Error: expect(locator).toBeVisible() failed
  43 | });
  44 | 
```