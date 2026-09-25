# ClimaVex — agricultural digital twin

An interactive digital twin of farmland in Anatolia. Farmers map fields, divide
them into crop sections and record a season. Banks and insurance agencies open
those twins to see repayment timing, shared-resource concentration, crop-mix
exposure and weather stress — and decide for themselves whether to lend.

**No AI model is connected.** Every predictive output comes from a published,
deterministic rule set behind a versioned interface that a trained model will
later implement. The whole application runs, and the whole demo completes, with
no AI service present.

---

## Quick start

Requires Node 20+ and PostgreSQL 15+ with the PostGIS extension.

```bash
# 1. A database with PostGIS
docker run -d --name climavex-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=climavex postgis/postgis:16-3.4

# 2. Configure
cp .env.example .env        # then set DATABASE_URL and SESSION_SECRET

# 3. Install, migrate, seed
npm install
npm run db:setup
npm run seed

# 4. Run
npm run dev                 # http://localhost:3000
```

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
   and contribution — the score is readable, not a black box.
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
npm run verify    # typecheck + lint + no-shadow guard + 73 tests
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

## Deliberately out of scope

No AI model or substitute provider. No live cadastral (TKGM) integration — their
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
