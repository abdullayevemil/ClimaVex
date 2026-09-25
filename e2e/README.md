# Browser checks

Two scripted journeys run against a running server (`npm run build && npm start`).
They use the Chromium already present in this environment; adjust
`executablePath` if your Playwright install manages its own browsers.

    node e2e/bank-journey.mjs     # bank analyst: risk score, finance, scenario, 403 on geometry
    node e2e/farmer-journey.mjs   # farmer: divide, assign crops, save, reload, recover

`farmer-journey.mjs` mutates the demo data. Run `npm run seed` afterwards to
restore the canonical demo state.
