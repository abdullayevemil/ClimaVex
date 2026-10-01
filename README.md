# ClimaVex — agricultural digital twin

An interactive digital twin of farmland in Anatolia. Farmers map fields, divide
them into crop sections and record a season. Banks and insurance agencies open
those twins to see repayment timing, shared-resource concentration, crop-mix
exposure and weather stress — and decide for themselves whether to lend.

**The risk score is connected to the ClimaVex ML service** (the separate AI
repository's `ml-service/`). For the region a farm sits in, the service supplies
a climate-stress index *measured* from Sentinel-2 NDVI and ERA5 reanalysis, and
an XGBoost *forecast* of next month's root-zone soil moisture; both enter the
score as named, weighted factors beside the farm's own structure. If the service
is not running, the published deterministic rule set answers instead and every
affected score says so — the whole application still runs with no AI service
present. See [AI model](#ai-model).

---

## Quick start

Requires **Node 22+** (Vitest 5 needs it) and PostgreSQL 15+ with PostGIS.

Start the database. Port **5433** is used deliberately — 5432 is usually taken
by an existing local Postgres:

```bash
docker run -d --name climavex-db -p 5433:5432 \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=climavex \
  postgis/postgis:16-3.4
```

Configure, install and run. `.env.example` already points at 5433, so it works
unchanged:

```bash
cp .env.example .env
npm install
npm run db:setup
npm run seed
npm run dev
```

Open <http://localhost:3000>.

For model-backed risk scores, start the ML service from the AI repository in a
second terminal (macOS needs `brew install libomp` once, for XGBoost):

```bash
cd <ai-repo>/ml-service
python3 -m venv .venv && .venv/bin/pip install -r requirements-serve.txt
.venv/bin/python -m uvicorn app.main:app --port 8001
```

The banner at the top of the map reads *AI model connected* once it answers.
Without it the app falls back to the rule set; set `PROVIDER=deterministic` in
`.env` to run that way on purpose.

<details>
<summary>If something goes wrong</summary>

| Symptom | Cause and fix |
|---|---|
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Another Postgres owns 5432. The command above uses 5433; clear the half-made container first with `docker rm -f climavex-db`. |
| `P1010: User was denied access` | `.env` does not match the container. It must read `postgresql://postgres:dev@localhost:5433/climavex?schema=public`. An `.env` left over from an earlier checkout is the usual culprit — overwrite it. |
| `ENOTEMPTY: rename .../node_modules/esbuild` | An interrupted install left a partial tree. `rm -rf node_modules && npm install`. |
| `sh: tsx: command not found` | The install did not finish. Same fix as above. |
| `EBADENGINE ... required: node >=22` | Switch Node: `nvm use 22`. |
| `Invalid project directory provided, no such directory: .../#` | A trailing `# comment` was pasted with the command. Run the commands without comments. |
| Apple Silicon: `requested image's platform (linux/amd64) does not match` | A warning, not an error — the official `postgis/postgis` tags are amd64-only and run fine under emulation. Prefer that. A native arm64 build exists at `imresamu/postgis:16-3.4`, but its arm64 support is self-described as experimental, so it is not worth swapping in just to silence a warning. |

</details>

The application opens directly onto the map. Sign in with any demo account —
password `climavex`:

| Account | Role | Can do |
|---|---|---|
| `bank@climavex.test` | Bank analyst | Read granted twins, **add loan terms and cash flows**, run scenarios |
| `insurer@climavex.test` | Insurance underwriter | Read granted twins, run scenarios |
| `farmer@climavex.test` | Farmer | Own and edit the twin: geometry, sections, crops |

## What to try

1. **Zoom to Konya demo farms**, then pick *Yıldız Tarım — Çumra*.
2. **Risk** tab → *Calculate risk score*. Every factor shows its weight, value
   and contribution — the score is readable, not a black box. The *Climate
   evidence* card shows what the ML service measured and forecast for the
   farm's region.
3. **Finance** tab → the 15 September instalment: ₺300,000 due, ₺180,000
   available, **₺120,000 short**. The insurance payout arrives in November and
   does *not* close that gap.
4. **Scenario** tab → *Run weather replay*, then compare baseline and scenario.
5. **Divide** tab (sign in as the farmer) → set N, preview, assign crops, save,
   then **reload the browser**: the layout comes back.
6. Try step 5 as the bank user — the API returns 403. Authorization is enforced
   server-side, not by hiding buttons.

## Verification

```bash
npm run verify    # typecheck + lint + no-shadow guard + 85 tests
npm run e2e       # two scripted browser journeys (server must be running)
```

## How it is put together

```
src/domain/      pure, framework-free, fully tested — no Prisma, no Next
  geometry/      projection, validation, measurement, subdivision
  finance/       decimal money, calendar dates, dated ledger, insurance
  scenario/      the provider contract, deterministic rules, canonical hashing
  vulnerability/ revenue-weighted crop mix, de-duplicated resource exposure
src/server/      auth, object-class authorization guards, PostGIS invariants
src/app/api/     route handlers
src/components/twin/   the map workspace
```

**Geometry.** GeoJSON (`[lng, lat]`, EPSG:4326) is the wire and storage format;
a database trigger derives the PostGIS geometry, the spheroidal area and the
centroid, so PostGIS — not the client — is the authority on area and validity.
Subdivision is a recursive area-bisection in TUREF/TM33 (EPSG:5255): each cut
runs perpendicular to the field's longest axis, so sections come out as compact
workable strips. It is deterministic, and every invariant (area conservation,
no overlap, containment, minimum section size) is re-checked inside the save
transaction.

**Money** is decimal throughout, never float. The ledger's defining property is
that each repayment is tested against the cash available *on its own calendar
date*, so a payout dated later cannot retroactively close an earlier gap.

**Authorization** splits by object class rather than read/write: farmers own
geometry and crops; banks and insurers add loan terms, cash flows and insurance
to twins they have been granted. Enforced in every route handler.

## AI model

`PROVIDER` in `.env` selects where the climate side of a risk score comes from.

| | `trained-model` | `deterministic` |
|---|---|---|
| Farm risk score (twin, **Risk** tab) | Structural factors + measured climate index + XGBoost drought forecast | Structural factors only; weather term is zero |
| Region assessment, loan review (`/bank`) | Measured index, its five sub-scores, CMIP6 projections | Heuristic over stored snapshots |
| Scenario yield impact (**Scenario** tab) | Rule set | Rule set |
| Needs the ML service | Yes — falls back to the rules, with a notice, if it is down | No |

`src/server/ml/client.ts` is the only code that talks to the service: a 5 s
timeout, one retry, and every response validated before it is trusted. A farm
is matched to its nearest model region inside this app, so its coordinates are
never sent anywhere.

Three things are deliberately *not* the model's:

- **Scenario yield impact stays rule-based.** The service measures and forecasts
  regional climate; it does not model how a crop responds to a replayed season.
- **The split of the weather weight** between the measurement (60%) and the
  forecast (40%) is a stated assumption in `trained-risk-provider.ts`, not
  something fitted — there are no observed losses to fit it against.
- **Money.** A provider returns scores and percentages; the ledger does all
  cash-flow arithmetic itself.

`npm run seed:bank` loads the `/bank` dashboard's six regions — from the
service's real observed record when it is running, from a demo series when not.

## Deliberately out of scope

No live cadastral (TKGM) integration — their
terms forbid unpermitted programmatic access and commercial use of results, so
parcels come from manual entry, drawing, import and demo fixtures. No production
hardening: this is a learning project sized for a handful of test users.

## Licences and attribution

Every dependency is free and open-source; there is no paid tier or metered API
anywhere.

The map defaults to **satellite imagery**, because a field boundary only means
something when you can see the field under it. Two key-less basemaps ship:

| Layer | Source | Attribution |
|---|---|---|
| Satellite (default) | Esri World Imagery | Imagery © Esri, Maxar, Earthstar Geographics |
| Streets | OpenStreetMap | © OpenStreetMap contributors |

Both are overridable with `NEXT_PUBLIC_SATELLITE_TILE_URL` and
`NEXT_PUBLIC_TILE_URL`. Neither provider's public tiles are intended for heavy
production traffic, so point these at your own tiles before deploying publicly.
PostGIS is GPL-2.0 and is used over a database socket, not linked.

The five-crop catalogue (wheat, barley, maize, sugar beet, sunflower) is a
**provisional demo catalogue**. Konya cultivation-area statistics could not be
verified, so no ranking claim is made. See `PLAN.md` §9.
