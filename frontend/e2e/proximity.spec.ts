import { test, expect, request } from '@playwright/test';

test('proximity alert appears for citizen after conductor reports location', async ({ browser }) => {
  const apiBase = process.env.E2E_API_URL;
  const frontendBase = process.env.E2E_FRONTEND_URL;
  if (!apiBase || !frontendBase) {
    test.skip(true, 'E2E_API_URL and E2E_FRONTEND_URL must be set');
    return;
  }

  const api = await request.newContext();

  // Login as conductor and post a location near a zone to trigger proximity
  const loginRes = await api.post(`${apiBase}/auth/login`, { data: { email: 'conductor@ecocusco.pe', password: 'Test12345!' } });
  expect(loginRes.ok()).toBeTruthy();
  const loginJson = await loginRes.json();
  const conductorToken = loginJson.token;
  expect(conductorToken).toBeTruthy();

  const trackRes = await api.post(`${apiBase}/operations/track-location`, {
    headers: { Authorization: `Bearer ${conductorToken}` },
    data: { truck_id: 4, latitude: -13.5350, longitude: -71.9847 }
  });
  expect(trackRes.status()).toBeGreaterThanOrEqual(200);

  // Login as citizen to view dashboard
  const citizenLogin = await api.post(`${apiBase}/auth/login`, { data: { email: 'ciudadano@ecocusco.pe', password: 'Test12345!' } });
  expect(citizenLogin.ok()).toBeTruthy();
  const citizenJson = await citizenLogin.json();
  const citizenToken = citizenJson.token;
  const citizenUser = citizenJson.user;

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(frontendBase);

  // Initialize localStorage with session + token then reload so app picks it up
  await page.evaluate(({ user, token }) => {
    localStorage.setItem('sir-session', JSON.stringify(user));
    localStorage.setItem('sir-token', token);
  }, { user: citizenUser, token: citizenToken });
  await page.reload();

  // Wait for alerts section and look for proximity alert title
  const proximity = page.locator('h4', { hasText: 'Aviso de proximidad' }).first();
  await expect(proximity).toBeVisible({ timeout: 8000 });
});
