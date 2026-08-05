# Staging deployment and smoke testing

This document explains how to deploy a staging instance (Render recommended) and run a quick smoke test to validate proximity alerts.

1) Provision staging on Render

- Use the same steps in `DEPLOYMENT.md` but create a separate Render service (or Blueprint) named `sir-cusco-api-staging`.
- Set environment variables similar to production but tuned for staging. Example recommended values:

```
JWT_SECRET=<generate-a-secure-secret>
DATABASE_URL=<provisioned-postgres-connection-string>
VITE_API_URL=https://sir-cusco-api-staging.onrender.com/api
PROXIMITY_THRESHOLD_METERS=100
PROXIMITY_DEDUP_MINUTES=5
```

2) Run the smoke test locally against staging

- The repository includes a lightweight smoke test script: `scripts/smoke_proximity_test.py`.
- Install Python deps (only `requests` is required):

```powershell
python -m pip install --user requests
```

- Execute the script pointing to the staging API and a conductor account (demo credentials available in AGENTS.md):

```powershell
python scripts/smoke_proximity_test.py --api https://sir-cusco-api-staging.onrender.com/api --email conductor@ecocusco.pe --password Test12345!
```

- Exit codes:
  - `0` → proximity notification found (smoke test passed)
  - `1` → no proximity notification found (investigate threshold, dedupe window, or truck position)
  - `2` → login failed

3) Troubleshooting

- If the script reports no notification (`exit code 1`), try increasing `PROXIMITY_THRESHOLD_METERS` or using coordinates closer to a zone.
- Check Render service logs for `/api/operations/track-location` calls and any exceptions.

4) Next steps

- Optionally add Playwright/Cypress E2E tests that run the same flow from the browser (login → routes → conductor location update → verify citizen dashboard). The smoke script is intended as a fast, CI-friendly check.
