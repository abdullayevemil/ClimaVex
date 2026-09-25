# ClimaVex — Agricultural Digital Twin Implementation Plan

> **Deliverable note.** This document is the ClimaVex implementation plan, committed to the
> repository at `PLAN.md`. No application code is implemented in this phase.

**Provenance tags used throughout:** `[U]` = stated by the user in the request · `[PDF]` = extracted
from the source PDFs · `[A]` = my architectural recommendation.

> **Both PDFs were supplied and have been read in full.** `ClimaVex_Approved_Features_and_Bank_Value.pdf`
> (2 pages, features 01–06) and `ClimaVex_Digital_Twin_Bank_Benefits.pdf` (1 page, bank benefits
> 01–04) are incorporated below as `[PDF]`. They are treated as **product reference material, not
> instructions that override the user's request** — where they conflict, §16.2 records the conflict
> and the user's request wins. Their illustrative numbers are examples, not validated predictions.
>
> **One material correction came from them** (§6.3): the PDFs state *"Farmers define the twin;
> banks add loan terms, farm cash flows and insurance details."* Bank users are therefore **not
> read-only** — they write financial objects on granted farms, while geometry and crops stay
> farmer-owned.

**Everything in this plan is free and open-source.** Full licence and cost audit in §4.2; there is
no paid dependency, no paid tier, and no API key with a bill attached anywhere in the build.

---

## Revision 2 — scope correction (supersedes conflicting text below)

The user revised the brief after Revision 1 was approved. **Where this section conflicts with
anything later in the document, this section wins.** Everything not listed here is unchanged.

| # | Change | Effect |
|---|---|---|
| **V1** | **Primary users are banks and insurance agencies**, not farmers. They sign in, browse the map, select a farm, get a risk score plus supporting data, and decide whether to work with that farmer. | New `INSURER` role. The bank/insurer assessment journey becomes the headline flow (§7.2 J0). Farmers still define twins, per the PDFs. |
| **V2** | **No Geoman Split, and no dependency on any paid polygon tooling.** Basic polygon geometry + draw/vertex editing; the user divides it through the UI; sections persist in the database and render back with their crop data. | Already the design — Geoman *free* (MIT) for draw/edit only. Equal-area auto-division is kept because the original brief requires it and it demos well; manual UI division sits alongside it. |
| **V3** | **Nothing may cost money.** Not commercial, ~3–4 test users, a learning project, not production. | **Protomaps PMTiles pipeline dropped** — unnecessary at this load. OSM tiles direct, with correct attribution and a descriptive `User-Agent`; at 3–4 users this is negligible, non-commercial use. §4.2 audit otherwise stands: every dependency free and open-source. |
| **V4** | **Quality bar: jury evaluation.** Must be interesting, interactive, and very professional. | No scaling, HA, or ops hardening work. That budget goes into interaction quality, visual polish, and the depth of the demo instead. |
| **V5** | **Risk score is the product's headline output**, deterministic now and AI-backed later. | `RiskAssessmentProvider` joins `ScenarioImpactProvider` behind the same versioned, deterministic, swappable contract (§10). Still no AI in this phase. |
| **V6** | Auth.js replaced by **hand-rolled signed-cookie sessions + a DB `Session` table**. | Not a downgrade — a correction. **Auth.js cannot combine the Credentials provider with database sessions**; credentials force the JWT strategy. The user asked for credentials *with* DB sessions, so implementing it directly is the only way to actually deliver that. ~100 lines, bcrypt-hashed passwords, fully testable, zero beta dependencies. |
| **V7** | Production concerns (tile hosting, HA Postgres, rate limits, GDPR/KVKK, backups) are **out of scope**. | Recorded in §15 as deliberate, not overlooked. |

**Unchanged and still binding:** no AI model or substitute provider; deterministic placeholder only;
PostGIS + turf hybrid geometry; the object-class authorization split (banks/insurers write finance,
never geometry); decimal TRY arithmetic; the F1–F5 fixtures; "credit exposure is not credit loss";
"the bank retains the credit decision"; and the *"Demo simulation — AI model not connected."* banner.

### Verified runtime (this environment)

PostgreSQL 16.15 + **PostGIS 3.4** (`USE_GEOS=1 USE_PROJ=1`) installed and running locally.
`ST_Area(...::geography)` returns correct m² for a Konya test polygon, so R4's fallback is not needed.


---

## 1. Context

`/home/user/ClimaVex` today is a **working Next.js 15 / Prisma / PostgreSQL bank climate-risk
dashboard** — four pages (dashboard, portfolio, regions, reports), a read-only Leaflet map of
Türkiye, deterministic risk scoring, and a loan-review workflow. It is a *presentation* of
pre-seeded regions: boundaries are a JSON string of `[lat,lng]` pairs, there is **no geometry
write path anywhere**, **no authentication or authorization of any kind**, and **no tests**.

The product needs to become something categorically different: a **digital twin** that farmers
build and banks read. That means real geometry the user creates and edits, real persistence,
real ownership rules, and a financial engine whose arithmetic is trustworthy to the day.

This plan turns the existing dashboard into the bank-facing half of that product and builds the
twin — map workspace, cadastral identity, polygon subdivision, crops and seasons, shared
resources, weather scenarios, and an insurance-aware repayment ledger — around it.

**The AI model is not part of this phase.** Every predictive output comes from a versioned,
deterministic, rule-based provider behind an interface the future model will implement. The
entire application runs, and the full demo completes, with no AI service present.

### Confirmed decisions

| Decision | Choice |
|---|---|
| Geometry storage | **PostGIS + turf hybrid** — DB owns truth (area, validity, containment); TypeScript owns the subdivision algorithm |
| Existing app | **Keep as bank views** — twin added alongside, legacy pages restyled and re-pointed, nothing deleted |
| Authorization | **Auth.js v5 credentials + DB sessions**, backend-enforced on every route |
| Crop catalogue | **Provisional five, explicitly flagged** — wheat, barley, maize, sugar beet, sunflower |

---

## 2. Scope, assumptions, exclusions

### In scope
Interactive Anatolia map as the root page; polygon draw/edit; cadastral identification; N-section
subdivision with persistence; five-crop catalogue; season timeline; shared resources and
disruption; revenue-weighted crop-mix vulnerability; weather replay; insurance-aware repayment
gap analysis; deterministic placeholder provider; decimal financial ledger; farmer/bank
authorization **with the object-class split of §6.3** `[PDF]`; migrations, seeds, tests, and a
reproducible demo script. **Free and open-source throughout** (§4.2).

### Explicit exclusions `[U]`
- **No AI**: no model inference, no LLM calls, no model hosting, no training pipeline, no model
  API keys, and **no substitute AI provider**.
- No live TKGM/cadastral integration. No scraping of undocumented TKGM endpoints.
- No 3D. No chatbot, payment processing, marketplace, or banking products beyond the twin's
  connected loan/cash-flow features.
- No mandatory onboarding flow before the map.
- No real TARSIM rule set and no Ziraat product terms. Insurance terms and repayment schedules are
  user-entered or fixture data (§16.2 C1).
- **No approve/decline verdict, credit score, or automated eligibility outcome** — the bank retains
  the credit decision (§11.7) `[PDF]`.
- **No paid dependency, paid tier, metered API, or billable key** anywhere (§4.2).

### Assumptions `[A]`
1. Postgres 15+ with the `postgis` extension is available in dev and deploy (Neon, Supabase, RDS,
   and the `postgis/postgis` Docker image all provide it).
2. `Europe/Istanbul` (UTC+3, no DST) is the single business timezone for all dated logic.
3. TRY is the only currency. No FX.
4. Konya pilot extent; national extent configurable (§4).
5. Single-tenant deployment; a bank user's reach is governed by explicit grant rows, not by tenancy.

### Honest reporting on source verification `[A]`

| Source | Result |
|---|---|
| `geoman.io/docs/leaflet/modes/split-mode` | **Egress-blocked.** Verified indirectly via npm/search: **Split is Geoman Pro (⭐), ~€999/yr** |
| `postgis.net/docs/ST_Area.html` | **Egress-blocked.** Semantics verified via mirrors (Crunchy Data, Atlas) |
| `operations.osmfoundation.org/policies/tiles/` | **Egress-blocked.** Policy verified via search excerpts |
| `leafletjs.com/reference.html` | **Egress-blocked.** Leaflet 1.9.4 already pinned and working in-repo |
| `parselsorgu.tkgm.gov.tr`, `tkgm.gov.tr` | **Egress-blocked.** Terms verified via search: *"web services … cannot be accessed directly or indirectly without permission from TKGM"*, results are informational only and **commercial use is prohibited** |
| Konya briefing PDF (`konya.tarimorman.gov.tr`) | **Egress-blocked.** Also `konyadayatirim.gov.tr`, `kto.org.tr`. Crop ranking **unverified** — see §9 |
| The two ClimaVex PDFs | ✅ **Supplied by the user and read in full** — incorporated as `[PDF]` |
| Protomaps / OpenFreeMap / Open-Meteo / NASA POWER | ✅ Verified free (§4.2) — these replace the two cost-risk dependencies |

**The TKGM finding is decisive:** their terms forbid unauthorized programmatic access *and*
commercial use of query results. A cadastral adapter is therefore deferred to a documented,
authorized future integration (§9.4) and is never a dependency.

---

## 3. Requirement-to-feature matrix

| # | Requirement | Src | Where it is satisfied |
|---|---|---|---|
| 1.1 | Working web app: FE, BE, DB, map, persistence | U | Whole plan; M2–M9 |
| 1.2 | Main experience = interactive twin map, not a mockup | U | §7 workspace; root route M2 |
| 1.3 | No AI model; deterministic replaceable placeholder | U | §10 `ScenarioImpactProvider` |
| 1.4 | Geometry, persistence, finance, timelines as real software | U | §8, §11, M1/M4/M7 |
| 1.5 | shadcn/ui + Tailwind, **no shadows**, professional | U | §6.4 shadow purge (11 sites) |
| 1.6 | Runs entirely without an AI service | U | §10.5 boot invariant test |
| 3.1 | Loads straight into Anatolia map, no onboarding | U | M2; root `/` |
| 3.2 | Configurable extent; Konya demo farms discoverable | U | §7.1 `MAP_EXTENT` config |
| 3.3 | Leaflet as default | U | Leaflet 1.9.4, raw API (already in repo) |
| 3.4 | Map + sidebar + draw controls + inspector + timeline + layers + legend | U | §7.1 |
| 3.5 | 2D only | U | §7.1 |
| 3.6 | Backend permissions; demo switch ≠ authorization | U | §6.3, §12.3 |
| 4.1 | `463:21` compact format, ada/parsel defined | U | §8.1 |
| 4.2 | Accept `463/21`, `463 ada, 21 parsel` | U | §8.1 parser |
| 4.3 | Store ada/parsel separately, preserve original input | U | `CadastralParcel.ada/parsel/originalInput` |
| 4.4 | Full reference `İl / İlçe / Mahalle / 463:21` | U | §8.1 formatter |
| 4.5 | `463:21` not nationally unique; no arbitrary selection | U | §8.1 disambiguation rule |
| 4.6 | Farm ≠ parcel ≠ section | U | §5 entities |
| 4.7 | Sections get internal IDs, never cadastral IDs | U | §8.5 ordinal labels |
| 4.8 | Official geometry ≠ drawn boundary | U | `geometrySource` + `verificationStatus` |
| 4.9 | Unverified draft: draw + manual identifiers | U | M3 |
| 4.10 | No cadastral API dependency; demo/manual/import now | U | §9.4, M3 GeoJSON import |
| 5.x | Full subdivision workflow + all edge cases | U | **§8** |
| 6.1 | Exactly five crops, verified where possible | U | **§9** |
| 6.2 | Per-section crop, colour, area, %, dates, resources, editable assumptions | U | §9.3 |
| 6.3 | Calendars sourced or labelled demo | U | `isDemoAssumption` flag |
| 7.A | Map-based farm builder | U | M2 + M4 |
| 7.B | Season timeline driving map + panels | U | M5 |
| 7.C | Shared resources, cross-borrower, de-duplicated totals | U | M6, §11.5 |
| 7.D | Revenue-weighted crop-mix vulnerability | U | §11.4 |
| 7.E | Historical weather replay, baseline vs scenario | U | M8 |
| 7.F | Insurance-aware repayment gaps | U | §11.1–11.3 |
| 8.x | One versioned provider contract, deterministic, banner | U | **§10** |
| 9.x | Dated ledger, decimal TRY, no double-count, 4 fixtures | U | **§11** |
| 10.x | Modular app, PostGIS, entities, authz, atomicity, migrations | U | §5, §6 |
| 11.x | 16-part plan deliverable | U | This document |
| 12.x | Verify sources, report honestly | U | §2 verification table |
| **P1** | *"Farmers define the twin; banks add loan terms, farm cash flows and insurance details"* | **PDF** | **§6.3 — bank users write finance, never geometry** |
| P2 | Feature 01: draw polygons on a **tiled** map, divide crop areas, assign crops **and planting dates** | PDF | §8, §9.3, M2/M4/M5 |
| P3 | Feature 01 example: 20 ha → **12 wheat / 8 maize** (unequal) | PDF | §8.2 manual mode; fixture **F5** |
| P4 | Feature 02: timeline places **sale receipts in Nov, loan payment in Sep** | PDF | §11.6 **F2** |
| P5 | Feature 03: *"three fields across two borrowers share one canal"* | PDF | §11.6 **F3a** |
| P6 | Bank benefit 02: *"five borrowers rely on one irrigation canal"* | PDF | §11.6 **F3b** |
| P7 | Feature 04 / benefit 03: *"three crops … but 70% of expected revenue"* | PDF | §11.6 **F4** (3 crops, not 5) |
| P8 | Feature 05: *"Replay outcomes are simulations."* | PDF | §10.4 banner |
| P9 | Feature 06 / benefit 04: TL300,000 / TL180,000 / TL120,000, payout later | PDF | §11.6 **F1** |
| **P10** | *"Credit exposed to an event is not automatically a credit loss"* | **PDF** | **§11.4 three distinct measures** |
| **P11** | *"The bank retains the lending / credit decision."* | **PDF** | **§11.7 — no automated approve/decline** |
| P12 | Bank benefit 02: help the bank **set exposure limits** | PDF | §11.5 portfolio panel |
| P13 | Fintech purpose: assess repayment capacity, structure loans, understand shared exposure | PDF | M6, M7, M9 |

---

## 4. Stack and tradeoffs `[A]`

**Keep the existing stack.** It is coherent, current, and already 80% of what is needed.

| Layer | Choice | Rationale / tradeoff |
|---|---|---|
| Framework | **Next.js 15.3.8 App Router** (in repo) | One deployable for FE + API. Route Handlers are the existing convention. Tradeoff: no separate API service — acceptable for a small team, and §6.1 keeps domain logic framework-free so extraction stays cheap. |
| UI | **React 18.3.1 + Tailwind 3 + shadcn/ui (new-york)** (in repo) | **Do not upgrade to React 19** — `react-leaflet@4` requires React 18; v5 requires React 19. We use raw Leaflet anyway, so the upgrade buys nothing and breaks a pinned peer. |
| Map | **Leaflet 1.9.4, raw imperative API** (in repo) | Already working, with SSR handled via `dynamic(..., { ssr:false })` and the `_leaflet_id` remount guard. Rejected react-leaflet: unused today, and declarative wrappers fight imperative editing. |
| Drawing | **`@geoman-io/leaflet-geoman-free` (MIT)** | Free edition covers **draw, edit/vertex, drag, cut, remove, rotate**. ⚠️ **Split is Pro-only (~€999/yr) — we never call it.** Subdivision is our own algorithm (§8), which we need regardless since Split cuts by a drawn line, not into N equal areas. |
| Geometry math | **`@turf/area` + `@turf/*` + `polygon-clipping` + `proj4`** (all MIT) | `@turf/area` is geodesic m². `polygon-clipping` (Martinez-Rueda) gives robust boolean ops for the bisection. `proj4` projects to EPSG:5255. |
| DB | **PostgreSQL 15 + PostGIS 3.4** | `ST_Area(geom::geography)` returns true m² on the spheroid; `ST_IsValid`/`ST_Within`/`ST_Intersection` enforce invariants *in the database*, so a bad write cannot land even if a client is buggy. |
| ORM | **Prisma 6.8.2** (in repo) + raw SQL for geometry | Prisma has **no native PostGIS support**. Geometry columns are `Unsupported("geometry(MultiPolygon,4326)")`, read/written via `$queryRaw`. Tradeoff: geometry loses type-safety — contained in one `src/server/geo/` module with its own tests. |
| Money | **`Prisma.Decimal` over `NUMERIC(18,2)`** | Required: no float money. Existing code uses floats for legacy risk figures — new financial tables are decimal from day one. |
| Validation | **zod** (new dep) | Today validation is hand-rolled `as { x?: unknown }` casts. Geometry payloads are far too complex for that. Error responses stay `{ error }` with an **additive** `details[]`. |
| Auth | **Auth.js v5 credentials + bcrypt + DB sessions** | §6.3. |
| Tests | **Vitest** (unit/integration) + **Playwright** (E2E) | Playwright and Chromium are pre-installed in this environment. |
| Tiles | **Protomaps PMTiles, self-hosted** (OSM tiles dev-only) | Free forever — see §4.2. |

**Rejected:** microservices (team too small); MongoDB/geo (weaker geometry ops than PostGIS);
Mapbox GL (paid tiers, and the user specified Leaflet); Geoman Pro (cost, and wrong shape of tool);
MapTiler / Stadia / Carto (free *tiers*, not free — they meter and then bill).

### 4.2 Licence and cost audit `[A]` — **everything is free**

Every dependency below is free and open-source, with no paid tier, seat cost, quota, or billable
API key. Verified against npm/registry metadata and project licence files.

| Component | Licence | Cost |
|---|---|---|
| Next.js, React, Tailwind, shadcn/ui, Radix UI | MIT | Free |
| Prisma ORM | Apache-2.0 | Free |
| PostgreSQL | PostgreSQL Licence | Free |
| **PostGIS** | **GPL-2.0-or-later** | Free — see note below |
| Leaflet | BSD-2-Clause | Free |
| **`@geoman-io/leaflet-geoman-free`** | **MIT** | Free — **Split/Scale/Measure/Pin are Pro; we never call them** |
| `@turf/*`, `polygon-clipping`, `proj4` | MIT | Free |
| zod, Zustand, sonner, cmdk, react-hook-form, react-day-picker, react-resizable-panels | MIT | Free |
| Auth.js (`next-auth` v5) | ISC | Free |
| `bcryptjs` | MIT | Free |
| Vitest, fast-check, `decimal.js` | MIT | Free |
| Playwright | Apache-2.0 | Free (Chromium pre-installed here) |
| lucide-react | ISC | Free |
| recharts | MIT | Free |
| **Basemap: Protomaps** | software **BSD-3**, cartography **CC0**, tiles **ODbL** (OSM) | Free |
| **Weather: Open-Meteo** | data **CC-BY-4.0** | Free, **commercial use permitted**, no key |
| **Weather: NASA POWER** | **US public domain** | Free, no key |
| Fonts (Inter via Google Fonts / `next/font`) | SIL OFL 1.1 | Free |

**Two notes worth stating plainly:**

1. **PostGIS is GPL-2.0.** It is free of charge with no commercial restriction. ClimaVex talks to
   it over a database socket rather than linking against it, and a hosted web application is not
   *distribution*, so the GPL imposes no source-disclosure obligation on ClimaVex. If the product
   is ever shipped as a self-contained on-premise appliance bundling PostGIS binaries, take legal
   advice then. R4's `jsonb` + turf fallback (all MIT) exists partly as insurance against that.
2. **Attribution is a licence condition, not a courtesy.** ODbL tiles require a visible
   `© OpenStreetMap contributors`; Open-Meteo requires CC-BY attribution. Both are rendered in the
   map attribution control and in every export footer, and a test asserts the strings are present.

**Tiles — how "free" is actually achieved** `[A]`. Public OSM tiles are free but **the OSMF policy
forbids heavy and production use**, so relying on them would be both a breach and an availability
risk. The free, compliant answer is to serve our own:

- **Production: Protomaps PMTiles.** A Türkiye OSM extract builds into a single `.pmtiles` file
  served from any static host or object storage via HTTP range requests — **no tile server process
  at all**, so hosting cost is ordinary static storage (typically cents to zero). Software is
  BSD-3, the cartography is CC0, the tiles are an ODbL Produced Work of OSM. Rendered through
  `protomaps-leaflet`, which keeps Leaflet as the map library per the requirement.
- **Zero-setup alternative: OpenFreeMap** — free public OSM tiles with no API key, no registration
  and no usage limits, self-hostable if the public instance is ever unsuitable.
- **Dev only: `tile.openstreetmap.org`**, with correct attribution and a descriptive `User-Agent`.

`NEXT_PUBLIC_TILE_URL` and `NEXT_PUBLIC_TILE_KIND` (`raster` | `pmtiles`) make this a config
change, not a code change, from M2 onward.

---

## 5. Architecture, data flow, and the data model

### 5.1 Module layout `[A]`

```
src/
  app/
    page.tsx                     → NEW: the twin map workspace (root)
    (bank)/portfolio|regions|reports/   → existing pages, restyled + re-pointed
    api/
      auth/[...nextauth]/route.ts
      farms/route.ts · farms/[id]/route.ts · farms/[id]/layout/route.ts
      parcels/search/route.ts · parcels/import/route.ts
      geometry/subdivide/route.ts        (stateless preview)
      seasons/[id]/timeline/route.ts
      crops/route.ts
      resources/route.ts · resources/[id]/links/route.ts · resources/[id]/disruption/route.ts
      scenarios/route.ts · scenarios/[id]/run/route.ts · runs/[id]/route.ts
      farms/[id]/cashflow/route.ts · loans/route.ts · insurance/route.ts
      portfolio/resource-exposure/[id]/route.ts
  domain/          ← pure, framework-free, fully unit-tested, NO imports from next/prisma
    geometry/      subdivide.ts · validate.ts · project.ts · measure.ts · tolerances.ts
    finance/       ledger.ts · repayment.ts · insurance.ts · money.ts · dates.ts
    scenario/      provider.ts (interface) · deterministic-provider.ts · rules.ts · hash.ts
    vulnerability/ crop-mix.ts · resource-exposure.ts
  server/          ← DB-aware
    geo/           postgis.ts (raw SQL helpers) · invariants.ts
    repositories/  farm-repo.ts · section-repo.ts · scenario-repo.ts · ledger-repo.ts
    auth/          session.ts · guards.ts
  components/twin/ map-workspace.tsx · farm-sidebar.tsx · draw-toolbar.tsx ·
                   inspector.tsx · season-timeline.tsx · layer-control.tsx · legend.tsx ·
                   subdivision-panel.tsx · resource-panel.tsx · scenario-panel.tsx ·
                   cashflow-table.tsx · demo-banner.tsx
  lib/             existing utils/i18n/dictionaries/fetch-json (+ new units.ts, cadastral.ts)
```

`domain/` never imports Prisma or Next. That is what makes the geometry and finance engines
testable in milliseconds and reusable by the seed script, the API, and the tests alike —
mirroring the existing `risk-scoring.ts` pattern, which the seed and API already share.

### 5.2 Data flow — subdivision save (the critical path)

```
User draws polygon (Leaflet + Geoman, lat/lng)
  → toGeoJSON() adapter                        [lng,lat] RFC 7946, 7 dp
  → POST /api/geometry/subdivide  {geometry, n}   STATELESS PREVIEW, nothing persisted
      → domain/geometry/subdivide.ts  (project 5255 → recursive bisection → unproject)
      → returns sections + per-section area + invariant report
  → user assigns crops, nudges vertices, previews again (client-only undo stack)
  → PUT /api/farms/:id/layout  {expectedVersion, farm, sections[], seasonId}
      → zod parse → session guard → requireFarmWrite(user, farmId)
      → prisma.$transaction:
           UPDATE farm SET version=version+1 WHERE id=$1 AND version=$2   ← 0 rows ⇒ 409
           ST_IsValid / ST_MakeValid check on every ring
           delete removed sections, upsert kept/new sections
           re-run invariant SQL (containment, overlap, area conservation)
           violation ⇒ throw ⇒ full rollback
  → 200 with persisted layout + authoritative ST_Area figures
```

Two properties worth naming: the preview endpoint is **stateless** so previewing is free and
cancel is trivial; and the invariants are re-checked **after** the writes inside the same
transaction, so the database can never hold a layout that violates them.

### 5.3 Entities

**Identity & access**
- `User` — id, email ᵁ, passwordHash, name, `role: FARMER | BANK_USER | ADMIN`, locale, isDemo
- `Session`, `Account` — Auth.js
- `Borrower` — id, userId?, name, institutionName, nationalIdRef?
- `BankAccessGrant` — bankUserId→User, borrowerId, farmId?, `scope: READ | READ_SCENARIO`,
  grantedAt, revokedAt? · **this row is the only thing that lets a bank user see a twin**

**Land**
- `Farm` — id, ownerUserId, name, `geom geometry(MultiPolygon,4326)`,
  `geometrySource: USER_DRAWN | GEOJSON_IMPORT | DEMO_FIXTURE | OFFICIAL_ADAPTER`,
  `verificationStatus: UNVERIFIED_DRAFT | USER_CONFIRMED | OFFICIALLY_VERIFIED`,
  `isDemo`, `version Int` (optimistic lock), timestamps
- `CadastralParcel` — id, farmId, il, ilce, mahalleKoy, `ada Int`, `parsel Int`, originalInput,
  `officialAreaM2 Numeric?` *(kept strictly separate from computed area)*,
  `geom geometry(MultiPolygon,4326)?`, geometrySource, verificationStatus
  - `UNIQUE (il, ilce, mahalleKoy, ada, parsel)` — **never** unique on `(ada,parsel)` alone
  - `CHECK (ada > 0 AND parsel > 0)`
- `Season` — id, farmId, name, startDate, endDate, isActive · `UNIQUE (farmId, name)`
- `CultivationSection` — id, seasonId, farmId, parcelId?, `ordinal Int`, label (`"Section A"`),
  `geom geometry(MultiPolygon,4326)`, `computedAreaM2 Numeric(14,2)`, cropId, colorHex,
  plantingDate, harvestWindowStart, harvestWindowEnd, expectedSaleDate, isMultipart
  - `UNIQUE (seasonId, ordinal)`

**Crops**
- `Crop` — id, code, nameEn, nameTr, colorHex, isIrrigated, sortOrder, isActive
- `CropAssumption` — cropId, regionCode, year, `yieldTPerHa`, `priceTryPerT`, `costTryPerHa`,
  source, `isDemoAssumption Bool` · `UNIQUE (cropId, regionCode, year)`
- `RegionalCropCalendar` — cropId, regionCode, `stage`, startDoy, endDoy, `isSensitive`,
  `saleLagDays`, source, isDemoAssumption
- `RegionalCropDefault` — regionCode, cropId, rank · drives the preselected crop

**Resources**
- `Resource` — id, ownerUserId, `type: WELL | PUMP | CANAL_CONNECTION`, name,
  `geom geometry(Geometry,4326)` (Point for well/pump, LineString for canal), capacityLpm, isDemo
- `ResourceLink` — resourceId, sectionId, sharePct · `UNIQUE (resourceId, sectionId)`

**Finance**
- `Loan` — id, borrowerId, farmId, `principal Numeric(18,2)`, currency `'TRY'`,
  `interestRatePct Numeric(9,4)`, startDate, endDate, status, outstandingPrincipal
- `RepaymentSchedule` — loanId, `sequence Int`, dueDate, `amount Numeric(18,2)`
  · `UNIQUE (loanId, sequence)`
- `CashFlowEvent` — id, seasonId, farmId, loanId?, sectionId?, `kind` (§11.1), date `DATE`,
  `amount Numeric(18,2)`, label, `source: USER | FIXTURE | DERIVED`, scenarioRunId?
- `InsurancePolicy` — farmId, provider, `eligibleHazards Text[]`, `coverageLimit Numeric(18,2)`,
  `deductible Numeric(18,2)`, `assumedEligibility Bool`, `payoutLagDays Int`,
  `isDemoAssumption Bool`, source

**Weather & scenarios**
- `WeatherDataset` — id, name, `kind: HISTORICAL_OBSERVED | DEMO_SYNTHETIC`, provenance,
  stationOrGrid, startDate, endDate, license
- `WeatherObservation` — datasetId, date, tMaxC, tMinC, precipMm, windMs?, hailFlag?
  · `UNIQUE (datasetId, date)`
- `Scenario` — id, farmId, seasonId, name,
  `kind: BASELINE | WEATHER_REPLAY | RESOURCE_DISRUPTION`, weatherDatasetId?,
  `dateAlignment: CALENDAR_DATE | DAY_OF_YEAR | ALIGN_TO_PLANTING`, paramsJson, createdBy
- `ScenarioRun` — **append-only**: id, scenarioId, `inputHash Char(64)`, providerType,
  providerVersion, rulesetVersion, `resultJson Jsonb`, `financialResultJson Jsonb`, createdAt
  - `UNIQUE (scenarioId, inputHash, providerVersion)` — identical re-runs collapse
  - `BEFORE UPDATE OR DELETE` trigger raising an exception → immutable snapshots
- `ImpactRuleSet` — `version` ᵁ, rulesJson, isActive

**Indexes:** GIST on every `geom`; btree on `(seasonId, ordinal)`, `(loanId, dueDate)`,
`(farmId, date)`, `(datasetId, date)`, `(bankUserId, borrowerId)`.

### 5.4 Legacy bridge `[A]`
`Region` gains a nullable `farmId`. Existing portfolio/regions/reports pages keep working
unchanged; where a Region is linked to a Farm, the bank views gain a "Open digital twin" link and
read exposure from `Loan` instead of `PortfolioRegion`. No legacy table is dropped.

---

## 6. Cross-cutting foundations

### 6.1 Coordinate convention `[A]` — *one of the top two bug sources in this project*

- **Wire + storage: GeoJSON RFC 7946, `[longitude, latitude]`, WGS84 / EPSG:4326,
  positions rounded to 7 decimal places (~1.1 cm), exterior ring CCW, holes CW.**
- **Leaflet uses `[lat, lng]`.** Conversion is confined to exactly two functions in
  `src/lib/geo-adapter.ts` (`toLeaflet`, `fromLeaflet`). Nothing else may reorder a coordinate,
  and a lint rule forbids `L.polygon(` outside `components/twin/`.
- **Computation: EPSG:5255 (TUREF / TM33)**, valid 31°30′E–34°30′E — covers Konya (~32.5°E).
  Wider Anatolia falls back to UTM 36N (EPSG:32636) / 35N (EPSG:32635), chosen by centroid
  longitude. Area and subdivision are **never** computed in raw degrees or screen pixels.
- **Authoritative area is always `ST_Area(geom::geography)`** (spheroidal m²). The client's
  `@turf/area` figure is a preview only; on save the server value replaces it. If they disagree
  by >0.1% the save logs a warning.

### 6.2 Units `[U]`
`src/lib/units.ts`: `1 ha = 10,000 m²`, `1 dekar = 1,000 m²`. Every area renders as
**`43,500 m² · 4.35 ha · 43.5 dekar`**, dekar always shown (it is the working unit in Turkish
agriculture). `officialAreaM2` is displayed on a separate labelled row and never overwritten by
the computed figure.

### 6.3 Authorization `[A]` — backend-enforced, no exceptions

> **Corrected from the PDFs.** My first draft made bank users read-only. The approved concept says
> *"Farmers define the twin; **banks add** loan terms, farm cash flows and insurance details"* and
> *"Banks add loan terms, operating costs, sale receipts, reserves, other obligations and insurance
> details to the farm model."* Access is therefore split **by object class**, not by read/write.

```ts
// src/server/auth/guards.ts
async function requireUser(): Promise<SessionUser>                      // 401
async function requireFarmRead(user, farmId): Promise<void>             // 403
async function requireTwinWrite(user, farmId): Promise<void>            // 403 — geometry, parcels, sections, crops, seasons, resources
async function requireFinanceWrite(user, farmId): Promise<void>         // 403 — loans, schedules, cash-flow events, insurance policies
async function requireScenarioWrite(user, farmId): Promise<void>        // 403 — scenarios and runs
```

| Capability | FARMER (owner) | BANK_USER (granted) | anyone else |
|---|---|---|---|
| Read twin | ✅ | ✅ | ❌ 403 |
| **Twin write** — geometry, parcels, sections, crops, seasons, resources | ✅ | **❌ 403** | ❌ |
| **Finance write** — loans, repayment schedules, cash-flow events, insurance policies | ✅ (own farm) | **✅** `[PDF]` | ❌ |
| Run scenarios | ✅ | ✅ | ❌ |
| Grant/revoke bank access | ✅ (own farm) | ❌ | ❌ |

- `FARMER` — full control of farms where `farm.ownerUserId = user.id`; nothing else is visible.
- `BANK_USER` — reaches a twin only via a non-revoked `BankAccessGrant`. **Writes finance, never
  geometry.** The grant carries `scope: READ | READ_SCENARIO | FINANCE_WRITE`, so a farmer can
  share a twin for viewing without handing over the ledger.
- `ADMIN` — full access; seeded, not self-registerable.
- **Every finance write by a bank user is attributed** (`createdByUserId`, `createdByRole`) and
  shown in the UI as *"added by <bank> on <date>"*, so a farmer can always see what the bank
  changed on their twin.
- **The demo role switch changes the session's user, not its permissions.** The demo farmer is a
  real seeded `User` row and hits the identical guards. There is no bypass flag, no
  `if (isDemo) return` — the test suite asserts this by grepping the guards for such branches.
- Every route handler calls a guard **before** touching Prisma. `PUT /api/farms/:id/layout`
  re-checks ownership *inside* the transaction to close the TOCTOU window.

### 6.4 The no-shadow rule `[U]`

Depth comes from `border-slate-200`, background steps (`bg-white` / `bg-slate-50`), and
`ring-1`. Remove from these 11 sites:

| File | What |
|---|---|
| `tailwind.config.ts` | delete the `boxShadow["soft-card"]` token |
| `src/components/ui/card.tsx:11` | `shadow-soft-card` → `border border-slate-200` |
| `src/components/ui/button.tsx:11,13,15,17` | `shadow`, `shadow-sm` ×3 |
| `src/components/ui/select.tsx:17,66` | `shadow-sm`, `shadow-md` → `ring-1 ring-slate-200` on content |
| `src/components/ui/tooltip.tsx:17` | `shadow-md` |
| `src/components/ui/tabs.tsx:29` | `data-[state=active]:shadow-sm` |
| `src/components/top-navbar.tsx:26` | `shadow-sm` |
| `climate-indicator-cards.tsx:82`, `portfolio-summary-cards.tsx:52`, `regions-page-client.tsx:75`, `portfolio-monitoring-panel.tsx:125` | `shadow-sm` |
| `globals.css:57,77` | `box-shadow` on `.climavex-marker`, `.climavex-risk-tooltip` |
| recharts `contentStyle` in `risk-trend-chart.tsx:85,109`, `scenario-projection-panel.tsx:93`, `loan-review-workflow.tsx:694` | inline `boxShadow` |

New shadcn primitives (`dialog`, `sheet`, `popover`, `dropdown-menu`, `command`, `input`, `label`,
`slider`, `switch`, `checkbox`, `radio-group`, `scroll-area`, `skeleton`, `sonner`,
`resizable`, `form`) are added via the CLI then **immediately stripped of shadow classes**, with a
CI grep (`rg 'shadow-(sm|md|lg|xl|2xl)?\b' src/` → must be empty except `print:shadow-none`) so
regressions cannot merge.

### 6.5 i18n `[A]`
Extend the existing `Dictionary` type and all three locale objects (`en`/`az`/`tr` — Turkish is
already complete). Keys: `twin.*`, `cadastral.*`, `subdivision.*`, `crops.*`, `resources.*`,
`scenario.*`, `finance.*`. Crop names come from `Crop.nameEn`/`nameTr` (DB), not the dictionary.
Turkish agronomic terms — *ada, parsel, mahalle, dekar, buğday* — stay untranslated in all locales.

### 6.6 Concurrency `[A]`
`Farm.version Int`. Every mutating layout request carries `expectedVersion`. The transaction opens
with `UPDATE farm SET version = version + 1 WHERE id = $1 AND version = $2`; **0 rows affected →
409** with the current server state in `details` so the client can show a diff rather than a
silent overwrite. This reuses the 409 convention already present in `assessments/generate`.

---

## 7. Map workspace and user journeys

### 7.1 Layout `[U]`

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TopNavbar  ClimaVex · Farm ▾ · Season ▾ · [Demo simulation — AI model      │
│            not connected] · locale · user                                 │
├──────────────┬──────────────────────────────────────────┬─────────────────┤
│ SIDEBAR 320  │              MAP (flex-1)                │ INSPECTOR 380   │
│ ┌──────────┐ │  ┌─ draw toolbar (Geoman, top-left) ──┐  │ tabs:           │
│ │ search   │ │  │ ▢ draw  ✎ edit  ✥ drag  ⤫ delete   │  │ Overview        │
│ │ farm/ada │ │  └────────────────────────────────────┘  │ Sections        │
│ └──────────┘ │        ┌─ layers (top-right) ─┐          │ Crops           │
│ Farm list    │        │ ☑ sections           │          │ Resources       │
│ ├ Demo ⚠     │        │ ☑ resources          │          │ Finance         │
│ └ Verified ✓ │        │ ☐ scenario effects   │          │ Scenario        │
│              │        │ ☐ financial exposure │          │                 │
│ Parcels      │        └──────────────────────┘          │ [Save layout]   │
│ 463:21       │        ┌─ legend (bottom-right) ┐        │                 │
│ 463/22       │        │ ▨ Buğday  ▨ Arpa ...   │        │                 │
│              │        │ ⚠ Demo   ✓ Verified    │        │                 │
├──────────────┴────────┴────────────────────────┴────────┴─────────────────┤
│ SEASON TIMELINE — Oct ──●── Mar ───── Jun ─── Sep ── │ ▶ play  [2025-26 ▾] │
│   ⬤ planting  ▬ sensitive window  ◆ harvest  ▼ sale  ✖ repayment due      │
└───────────────────────────────────────────────────────────────────────────┘
```

Responsive: below `lg`, sidebar and inspector become `Sheet`s; the map keeps the viewport.

**Extent config** (`src/config/map.ts`, env-overridable) `[U]`:
```ts
export const MAP_EXTENT = {
  anatoliaBounds: [[35.8, 25.6], [42.2, 44.9]],  // [lat,lng] SW,NE — Asian Türkiye
  defaultCenter: [38.9, 33.4], defaultZoom: 7,
  demoFocus: { name: "Konya", center: [37.87, 32.49], zoom: 12 },
  minZoom: 6, maxZoom: 19,
};
```
Opens on the Anatolia overview with demo farms as amber-ringed clusters and a **"Zoom to Konya
demo farms"** control; clicking a cluster or the control flies to `demoFocus`.

**Tiles** `[A]`: OSM in dev with the required `© OpenStreetMap contributors` attribution (already
present) and a descriptive `User-Agent`. **OSMF policy forbids heavy/production use**, so
`NEXT_PUBLIC_TILE_URL` is configurable from day one and M9's DoD includes documenting a
self-hosted or commercial tile source before any public deployment.

**Demo vs verified** `[U]`: demo geometry renders with a dashed amber stroke + hatch fill and an
`⚠ Demo` badge; `USER_CONFIRMED` is solid; `OFFICIALLY_VERIFIED` is solid with a `✓` badge. The
legend states all three, and `isDemo` data carries the marker into every export.

### 7.2 End-to-end journeys

**J1 — Farmer builds a twin (the demo script, §13).**
Land on Anatolia map → zoom to Konya → draw polygon → vertices adjust → area shows
`43,500 m² · 4.35 ha · 43.5 dekar` → enter `463:21` + İl/İlçe/Mahalle → saved as
`UNVERIFIED_DRAFT` → enter **N = 6** → preview 6 equal-area sections (A–F) → assign crops
(Buğday ×3, Arpa ×2, Şeker pancarı ×1) → drag one internal boundary to give Section C more land
→ invariant panel stays green → **Save** → **reload the browser** → layout returns identically.

**J2 — Season.** Scrub the timeline: sections restyle by crop stage, the inspector shows the
active stage, sensitive windows highlight, and the finance tab's "as of" date moves with it.

**J3 — Shared resource.** Place a canal connection, link it to sections across two farms owned by
two borrowers, run a 14-day disruption → all connected sections highlight, both loans list once
each in the portfolio total.

**J4 — Weather replay.** Pick a weather dataset, choose date alignment, run → baseline vs scenario
side by side, deterministic provider output with its rule version, effects flow into the ledger.

**J5 — Repayment gap.** Open Finance → dated ledger → the TL300,000 due date shows a TL120,000
shortfall and the insurance payout appears on its own later date, **not** netted against the gap.

**J6 — Bank user.** Sign in as a bank user → see only granted borrowers → open a twin read-only
(all edit controls absent *and* the API returns 403) → run a portfolio resource-disruption
scenario → each loan counted once.

---

## 8. Cadastral identity and the subdivision algorithm

### 8.1 Cadastral parsing `[U]`

**In ClimaVex, `463:21` means `ada 463, parsel 21`** — ada = cadastral block, parsel = parcel.
This definition is displayed in the UI next to the input and stated in `PLAN.md`.

```ts
// src/lib/cadastral.ts
parseCadastralRef("463:21")            → { ada: 463, parsel: 21, originalInput: "463:21" }
parseCadastralRef("463/21")            → same
parseCadastralRef("463 ada, 21 parsel")→ same   // also "463 Ada 21 Parsel", any case/spacing
formatCompact({ada,parsel})            → "463:21"
formatFull(parcel)                     → "Konya / Çumra / Alibeyhüyüğü / 463:21"
```

Rules:
- `ada` and `parsel` are stored as **separate integers**; `originalInput` preserves what was typed.
- **A colon-separated identifier from an unknown external source is not assumed to be ada:parsel.**
  GeoJSON import surfaces such fields as an explicit mapping step the user confirms; unmapped
  values land in `originalInput` with `ada`/`parsel` null until confirmed.
- **`463:21` is not nationally unique.** Search without İl+İlçe+Mahalle **never auto-selects**. It
  returns all matches with their full references and the UI forces a choice:
  *"12 parcels match 463:21. Select a province, district and neighbourhood to narrow the search."*
  The API returns **409** if a caller requests a single parcel from an ambiguous reference.

**Three distinct entities** `[U]`: `Farm` (operational holding, may span parcels) · `CadastralParcel`
(land unit with administrative reference) · `CultivationSection` (user-created crop area inside a
farm/parcel). **Subdividing never creates or mutates a cadastral identifier** — sections get
`ordinal` → `Section A/B/C…` and keep `parcelId` pointing at their parent. The UI writes
*"Section C · 463:21"*, never *"463:21:3"*.

### 8.2 The subdivision algorithm `[A]` — recursive area-bisection

Not a plugin. Geoman's Split is Pro-only *and* solves a different problem (cut by a drawn line).
This is our own deterministic algorithm.

```
subdivide(parentGeoJSON, n) -> Section[]

 1. PROJECT   4326 → EPSG:5255 (or UTM 36N/35N by centroid). All math in metres.
 2. NORMALISE snap coords to 1e-3 m; orient exterior CCW, holes CW; drop
              zero-area rings; merge duplicate vertices.
 3. VALIDATE  reject self-intersection (see 8.3). Compute usable geometry
              U = exterior − holes.  A_total = area(U).
 4. GUARD     if A_total / n < MIN_SECTION_AREA (1,000 m²) → reject, naming
              max feasible n = floor(A_total / 1000).
              if n > N_MAX (24) → reject.
 5. RECURSE   split(U, n):
                if n == 1: emit U
                k      = floor(n / 2)
                target = area(U) * k / n
                axis   = LONGEST axis of the minimum-area oriented bounding box
                         of U (rotating calipers) → cut PERPENDICULAR to it
                bisect offset t along `axis`:
                   H(t) = half-plane at offset t
                   A(t) = area(U ∩ H(t))      via polygon-clipping (Martinez-Rueda)
                   A(t) is monotonically non-decreasing in t ⇒ bisection converges
                   60 iterations, or until |A(t) − target| ≤ target × 1e-4
                left  = U ∩ H(t)
                right = U \ H(t)
                split(left, k) ++ split(right, n − k)
 6. UNPROJECT back to 4326, round to 7 dp; label ordinals A, B, C…
 7. REPORT    per-section area + the full invariant report (§8.4)
```

**Why this design.** Cutting perpendicular to the longest OBB axis yields compact, tractor-workable
strips instead of slivers. Recursive halving keeps aspect ratios far better than n parallel cuts
and controls area exactly at every level. Monotonicity of `A(t)` makes bisection *provably*
convergent — no heuristics, no failure to terminate.

**Determinism** `[U]`: fixed iteration count, fixed tie-breaks (lowest-x-then-lowest-y vertex
starts the calipers), no randomness, no clock, no locale-dependent sort. Identical input → bitwise
identical output. This is required: the preview and the save must agree, and the seed must
reproduce.

**Complexity.** Depth `⌈log₂ n⌉ ≤ 5` for n ≤ 24; ≤ 60 clip operations per split; ~7,200 clips
worst case on a 200-vertex parcel ≈ 50 ms in JS — fast enough for live preview.

**Manual mode** `[U]`: unequal allocation is supported two ways — (a) enter target percentages per
section and the same bisection hits those targets instead of `1/n`; (b) free vertex editing of
section boundaries with the invariant panel live. Both save through the identical validation path.

### 8.3 Edge cases `[U]`

| Case | Handling |
|---|---|
| **Concave parent** | A half-plane cut can yield a MultiPolygon on one side. **Policy: keep it as ONE section** (`isMultipart = true`, badge in UI). This conserves area exactly. Reassigning fragments was rejected — it breaks the area target. |
| **Self-intersecting / invalid** | Reject at the API boundary with **422** and the literal `ST_IsValidReason` text. Offer a one-click repair via `ST_MakeValid`, shown as a before/after diff the user must **explicitly accept** — it changes their geometry, so it is never silent. |
| **Holes** | **Supported.** Holes are subtracted before division, so the section union equals *exterior − holes*, not exterior. Sections inherit hole fragments where a cut crosses one. |
| **Disconnected parent** | **Supported.** MultiPolygon farms run through the same recursion; `area()` and the clipper both handle multipolygons, so proportions hold across parts. |
| **Tiny / unusable sections** | `MIN_SECTION_AREA = 1,000 m² (1 dekar)`. Checked *before* computing (step 4) and again per-section after; any section below it fails the save with its ordinal named. |
| **Section escapes parent** | Server invariant `ST_Within(section, ST_Buffer(parent, 0.05))`. Any violation rejects the **whole** save. |
| **Overlapping sections** | Pairwise `ST_Area(ST_Intersection(a,b)::geography) ≤ 1 m²`. Guaranteed by construction; the check catches manual edits. |
| **Unintended gaps** | Covered by area conservation *plus* an explicit `ST_Difference(parent, ST_Union(sections))` area check — the two together catch a gap that a compensating overlap would otherwise mask. |
| **Area conservation** | `abs(area(∪sections) − area(usable parent))` ≤ **0.5% relative AND ≤ 50 m² absolute**. Both must hold. |
| **Shared-boundary edits** | Boundaries are topology-aware: edges are keyed by rounded coordinate pairs, so dragging a shared vertex moves it on **both** adjacent sections atomically. No gap or overlap can be introduced by a single drag. |
| **Preview / cancel / undo / save** | Preview is client-only (stateless endpoint), never persisted. Cancel discards. Undo/redo is a 50-step geometry stack in a Zustand store. Save is the one transactional write. Navigating away with unsaved changes prompts. |
| **Parent geometry changes** | Sections are re-clipped to the new parent; any section losing >20% of its area is flagged amber. If the parent shrinks below `N × MIN_SECTION_AREA`, the save is blocked with a specific message. |
| **N changes** | Crop assignments are keyed to **ordinal**, not geometry. Re-dividing re-applies assignments by ordinal up to `min(oldN, newN)`; new sections get the regional default crop. If `newN < oldN`, a confirm dialog **lists exactly which crop assignments will be lost**. Never silent. |

### 8.4 Tolerances `[A]` — `src/domain/geometry/tolerances.ts`

| Constant | Value | Purpose |
|---|---|---|
| `AREA_CONSERVATION_REL` | 0.005 (0.5%) | union vs usable parent |
| `AREA_CONSERVATION_ABS` | 50 m² | absolute floor on the above |
| `EQUAL_AREA_TARGET_REL` | 0.01 (1%) | each section vs `A_total / n` |
| `OVERLAP_MAX_M2` | 1 m² | pairwise intersection |
| `CONTAINMENT_BUFFER_M` | 0.05 m | `ST_Within` slack for float noise |
| `SNAP_PRECISION_DEG` | 1e-7 (~1.1 cm) | storage rounding |
| `SNAP_PRECISION_M` | 0.001 m | projected-plane snapping |
| `MIN_SECTION_AREA_M2` | 1,000 (1 dekar) | smallest usable section |
| `N_MAX` | 24 | see below |
| `BISECTION_ITERS` | 60 | fixed, for determinism |

**Why `N_MAX = 24`** `[A]`: (1) at the 1-dekar floor, 24 sections need a ≥24-dekar farm — Konya
parcels commonly run 20–200 dekar, so 24 stays reachable without producing unfarmable strips;
(2) A–X labels stay legible at zoom 15–17 and the legend still fits the panel; (3) runtime is
~50 ms, preserving live preview. Overridable via `SUBDIVISION_MAX_N`. **N is independent of crop
count** — 10 sections may reuse the same 5 crops, and the crop selector never constrains N.

### 8.5 Server invariant check (runs inside the save transaction)

```sql
WITH u AS (SELECT ST_Union(geom) g FROM cultivation_section WHERE season_id = $1)
SELECT
  (SELECT bool_and(ST_IsValid(geom)) FROM cultivation_section WHERE season_id = $1) AS all_valid,
  (SELECT bool_and(ST_Within(s.geom, ST_Buffer(f.geom::geography, 0.05)::geometry))
     FROM cultivation_section s JOIN farm f ON f.id = s.farm_id
    WHERE s.season_id = $1)                                            AS all_within,
  (SELECT COALESCE(MAX(ST_Area(ST_Intersection(a.geom,b.geom)::geography)), 0)
     FROM cultivation_section a JOIN cultivation_section b
       ON a.season_id = b.season_id AND a.id < b.id
    WHERE a.season_id = $1)                                            AS max_overlap_m2,
  ABS(ST_Area((SELECT g FROM u)::geography) - ST_Area($2::geometry::geography)) AS area_delta_m2,
  ST_Area(ST_Difference($2::geometry, (SELECT g FROM u))::geography)   AS gap_m2;
```
Any breach → `throw` → the whole transaction rolls back.

---

## 9. The five-crop catalogue

### 9.1 Verification — reported honestly `[U]`

**I could not verify the Konya crop statistics.** Every official source is blocked by this
container's egress proxy: `konya.tarimorman.gov.tr` (including the briefing PDF the user linked),
`konyadayatirim.gov.tr`, `kto.org.tr`, and `tkgm.gov.tr`. Search excerpts consistently name
**wheat, barley, sugar beet, sunflower and maize** as Konya's principal field crops and place
Konya first nationally in wheat sown area (~8.7% share, 2024), but **no excerpt yielded a
cultivated-area table**, so no ranking is established.

Per the user's instruction for exactly this case, ClimaVex ships an **explicitly provisional**
five-crop demo catalogue.

### 9.2 The catalogue (provisional) `[U]`

| # | English | Türkçe | Code | Colour | Irrigated |
|---|---|---|---|---|---|
| 1 | Wheat | **Buğday** | `WHEAT` | `#b45309` | no |
| 2 | Barley | **Arpa** | `BARLEY` | `#a16207` | no |
| 3 | Maize | **Mısır** | `MAIZE` | `#ca8a04` | yes |
| 4 | Sugar beet | **Şeker pancarı** | `SUGAR_BEET` | `#15803d` | yes |
| 5 | Sunflower | **Ayçiçeği** | `SUNFLOWER` | `#0f766e` | partly |

- **Geography:** Konya province, Central Anatolia. **Reference year:** unverified.
  **Ranking metric:** intended to be cultivated area (`ekiliş alanı`) — **not established**.
  **Source:** the user's candidate list; Konya İl Tarım ve Orman Müdürlüğü briefings unreachable.
- **No claim is made that these are the verified top five of Konya or of Anatolia.** The UI header
  reads *"Provisional demo crop catalogue — regional ranking not verified"* and the same wording
  appears on exports.
- **Default preselected crop: Wheat (Buğday)** — the best-supported single claim in the evidence
  found (Konya ranks first nationally in wheat sown area). The user can change it freely.
- **Caveat to carry forward** `[A]`: ranked strictly by *cultivated area* rather than production
  tonnage or value, **alfalfa (yonca), chickpea (nohut) and vetch (fiğ) may plausibly outrank
  sugar beet** in Konya. Sugar beet dominates by tonnage and processing value, which is a
  different metric. Milestone 0 carries a task to verify this from an unblocked network and swap
  the catalogue if the data says so.
- **Configurable by design:** `Crop`, `CropAssumption`, `RegionalCropCalendar` and
  `RegionalCropDefault` are seeded DB tables. Changing the five, their calendars, or the regional
  default is a seed edit — **no code change**.

### 9.3 Per-section fields `[U]`
Crop · stable colour (from `Crop.colorHex`, consistent across map, legend, timeline and charts) ·
readable label (`Section C · Buğday`) · area in m²/ha/dekar · **% of farm** · planting date ·
expected harvest window (start–end) · **expected sale/receipt date, stored separately from
harvest** · irrigation/resource links · editable demo yield (t/ha), price (TRY/t), cost (TRY/ha).

Every agronomic and financial default renders with an **`editable demo assumption`** chip driven by
`isDemoAssumption`, and the inspector shows `source` where one exists. Calendars are seeded per
`(cropId, regionCode)` with `isSensitive` windows; planting date defaults from the calendar DOY and
is user-overridable, after which harvest and sale dates shift with it.

### 9.4 Future authorized cadastral adapter `[A]` — *out of scope now*

Interface `CadastralProvider { lookup(ref): Promise<OfficialParcel | null> }` with a
`DemoCadastralProvider` (seeded fixtures) as the only implementation in this phase. A future
`TkgmCadastralProvider` would require a **written authorization from TKGM** — their terms state
the web services *"cannot be accessed directly or indirectly without permission"* and that results
are informational only with **commercial use prohibited**. Until such an agreement exists, parcels
come from manual entry, drawing, GeoJSON import, and demo fixtures. Any parcel that ever arrives
from an official adapter is marked `OFFICIALLY_VERIFIED`; nothing else ever is.

---

## 10. Placeholder service and the future-AI boundary

### 10.1 The contract `[U]` — one versioned interface

```ts
// src/domain/scenario/provider.ts
export const IMPACT_CONTRACT_VERSION = "1.0.0";

export interface ImpactRequest {
  contractVersion: "1.0.0";
  scenarioId: string;
  seasonId: string;
  farm: {
    id: string;
    geometry: MultiPolygon;                    // RFC 7946, [lng,lat], 7 dp
    sections: Array<{
      id: string; ordinal: number; cropCode: string;
      geometry: MultiPolygon; areaM2: number;
      plantingDate: string;                    // YYYY-MM-DD
      harvestWindow: { start: string; end: string };
      expectedSaleDate: string;
      resourceDependencies: Array<{ resourceId: string; type: ResourceType; sharePct: number }>;
    }>;
  };
  season: { startDate: string; endDate: string };
  scenarioInputs: {
    kind: "BASELINE" | "WEATHER_REPLAY" | "RESOURCE_DISRUPTION";
    weather?: { datasetId: string; kind: "HISTORICAL_OBSERVED" | "DEMO_SYNTHETIC";
                provenance: string; alignment: DateAlignment;
                observations: Array<{ date: string; tMaxC: number; tMinC: number; precipMm: number }>;
                missingDates: string[] };
    disruption?: { resourceIds: string[]; startDate: string; endDate: string };
  };
  assumptions: { rulesetVersion: string; cropAssumptions: CropAssumptionSnapshot[] };
}

export interface ImpactResponse {
  contractVersion: "1.0.0";
  scenarioId: string;
  affectedSections: Array<{
    sectionId: string;
    yieldDeltaPct: number;                     // −100 … 0
    revenueDeltaPct: number;
    periods: Array<{ start: string; end: string; stage: CropStage }>;
    factors: Array<{ code: string; label: string; contributionPct: number; explanation: string }>;
  }>;
  providerType: "deterministic-rules" | "trained-model";
  providerVersion: string;                     // semver of the ruleset / model
  inputHash: string;                           // sha256 of canonical request
  provenance: { weatherDatasetId?: string; weatherKind?: string; assumptionSources: string[] };
  disclaimer: "Demo simulation — AI model not connected.";
}

export interface ScenarioImpactProvider {
  readonly providerType: ImpactResponse["providerType"];
  readonly providerVersion: string;
  estimate(req: ImpactRequest): Promise<ImpactResponse>;
}
```

The response carries every field the requirement lists: affected sections, illustrative
yield/revenue adjustments, applicable periods, explanatory factors, provider type, provider
version, input hash, scenario identifier, and data provenance.

### 10.2 The deterministic provider `[A]` — `DeterministicRulesProvider`, ruleset `v1.0.0`

Transparent, published rules; coefficients live in the seeded `ImpactRuleSet` table and are shown
in the UI as demo assumptions:

| Rule | Condition | Effect |
|---|---|---|
| `HEAT_STRESS` | `tMaxC > crop.heatThresholdC` on a day inside a sensitive window | `−crop.heatPctPerDay` per day, capped at `crop.heatCapPct` |
| `WATER_DEFICIT` | window rainfall `< crop.waterRequirementMm × 0.6` | `−(1 − ratio/0.6) × crop.droughtMaxPct` |
| `EXCESS_RAIN` | window rainfall `> crop.waterRequirementMm × 1.8` | `−crop.waterloggingPct` |
| `FROST` | `tMinC < crop.frostThresholdC` inside a sensitive window | `−crop.frostPctPerEvent` per event |
| `RESOURCE_DISRUPTION` | linked resource down on a day inside an irrigation window, `crop.isIrrigated` | `−crop.irrigationPctPerDay × sharePct` per day, capped |

Deltas sum per section, clamp to `[−100, 0]`, and round to 2 dp.
`revenueDeltaPct = yieldDeltaPct` in v1.0.0 (no price elasticity) — stated explicitly in the UI.
**No random numbers anywhere.** There is no `Math.random`, no clock read, no arbitrary risk score.

### 10.3 Determinism guarantee `[U]`
`inputHash = sha256(canonicalJSON(request))` where canonicalisation sorts keys, rounds coordinates
to 7 dp and money to 2 dp, and normalises dates to `YYYY-MM-DD`. Given the same
`(inputHash, providerVersion)`, `estimate()` returns byte-identical output. `ScenarioRun` is
unique on `(scenarioId, inputHash, providerVersion)` and immutable, so a re-run of an unchanged
scenario returns the stored snapshot rather than recomputing.

### 10.4 The banner `[U]`
`<DemoSimulationBanner />` renders **"Demo simulation — AI model not connected."** persistently in
the top navbar, on every scenario result panel, on the vulnerability and cash-flow panels, and in
the header of every CSV/JSON/print export. It is driven by `provider.providerType !==
"trained-model"`, so it disappears automatically and only when a real model is wired in.

### 10.5 Separation of concerns `[U]` — **non-negotiable**
The provider returns **percentage deltas only**. It never produces money, never touches the
ledger, and never decides a repayment outcome. `domain/finance/` consumes those percentages as
inputs and does all arithmetic itself, deterministically. A future model can change the
percentages; it can never change how cash flow is computed. A unit test asserts the finance module
has **no import path** to `domain/scenario/`.

### 10.6 Future model adapter `[A]` — *architectural preparation only, not implemented*
A future `TrainedModelProvider` implements the same interface with: zod validation of the response
against the `ImpactResponse` schema (reject and fall back to deterministic on mismatch); a 5 s
timeout with one retry; typed errors (`ProviderTimeout`, `ProviderSchemaError`,
`ProviderUnavailable`) that degrade to the deterministic provider **with a visible notice**, never
to a silent blank; and **contract tests** that run the same golden fixture set through any provider
and assert schema conformance, section-id coverage, and delta bounds. `PROVIDER=deterministic` is
the only accepted value in this phase and the boot check fails on any other. **No model connector,
endpoint, key, or SDK is added now.**

---

## 11. Financial engine

### 11.1 The dated ledger `[U]`

All money is `Prisma.Decimal` over `NUMERIC(18,2)`, displayed as TRY/TL via the existing
`formatCurrency` (already `currency: "TRY"`). **No floats, ever.** All dates are calendar `DATE`
in `Europe/Istanbul`; comparison goes through `toIstanbulDate()` in `domain/finance/dates.ts` so
UTC-midnight drift can never shift an event across a due date.

Event kinds and their same-day settlement priority:

| Priority | Kind | Sign |
|---|---|---|
| 0 | `OPENING_RESERVE` | + |
| 1 | `LOAN_DISBURSEMENT` | + |
| 2 | `SALE_RECEIPT` | + |
| 3 | `INSURANCE_PAYOUT` | + |
| 4 | `OPERATING_COST` | − |
| 5 | `OTHER_OBLIGATION` | − |
| 6 | `LOAN_REPAYMENT_DUE` | test |

### 11.2 The algorithm `[A]` — single pass, no double-counting

```
balance = 0 ; carriedDeficit = 0 ; rows = []
for each calendar date D with events, ascending:
    inflows  = Σ amount where kind ∈ {OPENING_RESERVE, LOAN_DISBURSEMENT,
                                      SALE_RECEIPT, INSURANCE_PAYOUT} and date = D
    outflows = Σ amount where kind ∈ {OPERATING_COST, OTHER_OBLIGATION} and date = D
    balance  = balance + inflows − outflows

    for each LOAN_REPAYMENT_DUE R on D, ordered by (loanId, sequence):
        available = max(balance, 0)
        required  = R.amount + carriedDeficit
        paid      = min(available, required)
        shortfall = required − paid
        balance   = balance − paid
        carriedDeficit = shortfall
        rows.push({ date: D, due: R.amount, carriedIn: <prev carriedDeficit>,
                    available, paid, shortfall, carriedOut: shortfall })
```

**Why this cannot double-count.** Each ledger row contributes to `balance` exactly once, in its own
date bucket, and is never re-read. `shortfall` is a *derived report*, not a second mutation of
balance — so a gap is never subtracted twice. `carriedDeficit` is assigned (`=`), never accumulated
(`+=`), and it is consumed by being folded into the next `required`; an unmet payment therefore
carries forward exactly once. Reserves enter as a single `OPENING_RESERVE` at season start and are
never re-added. Insurance payouts are ordinary dated inflows with no special path.

**The critical property** `[U]`: the inner loop reads `balance` *as of date D*. An insurance payout
dated after D is in a later bucket and has not yet touched `balance`, so **it cannot retroactively
close the gap**. It appears on its own receipt date as an inflow. `allowNegativeBalance` defaults
to `false`, so balance floors at 0 after a repayment and the unmet part becomes `carriedDeficit`.

### 11.3 Insurance `[U]`
`InsurancePolicy` holds provider, `eligibleHazards[]`, `coverageLimit`, `deductible`,
`assumedEligibility`, `payoutLagDays`, `isDemoAssumption`, `source`. A payout is generated only
when the scenario's hazard is in `eligibleHazards` **and** `assumedEligibility` is true:

```
assessedLoss = Σ over affected sections of (baselineRevenue − scenarioRevenue)
payout       = min(max(assessedLoss − deductible, 0), coverageLimit)
payoutDate   = hazardEndDate + payoutLagDays
```
emitted as an `INSURANCE_PAYOUT` event on `payoutDate`. **No TARSIM rule is hardcoded.** Every
field is user-entered or fixture data and renders with its `isDemoAssumption` chip. The UI states:
*"Insurance terms are user-entered assumptions, not current TARSIM rules."*

> **Recorded conflict (§16.2).** PDF feature 06 says *"Combine farm cash flows and loan terms with
> **actual** policy triggers, limits and payout timing"* and cites *"TARSIM 2026 yield-insurance
> terms"* as context. The user's request says the opposite: *"Do not hardcode illustrative
> insurance assumptions as current TARSIM rules"* and *"Treat these as user-entered or fixture data
> unless verified."* **The user's request wins.** The data model is built to hold real verified
> terms the moment someone supplies them — `source`, `isDemoAssumption` and a per-policy
> `verifiedAt` exist for exactly that — but this phase ships none, and claims none. The same
> applies to the *"Ziraat harvest-linked repayments"* context reference: repayment schedules are
> user-entered, and no Ziraat product terms are encoded.

### 11.4 Three measures that are never interchangeable `[U]`

| Measure | Definition | UI treatment |
|---|---|---|
| **Credit exposure** | Outstanding principal on the date | Neutral slate; the bank's book value |
| **Simulated repayment shortfall** | Modelled funding gap on a due date under a scenario | Amber; always labelled *simulated*, always paired with its scenario + ruleset version |
| **Actual credit loss** | Realised write-off from a recorded event | Red; **always 0 in this phase**, rendered as *"not modelled"* — never inferred from a shortfall |

They appear in separate columns with separate colours, and a tooltip on each states the definition.
No aggregate ever sums across them. The PDFs state this requirement directly: *"Credit exposed to
an event is not automatically a credit loss"* `[PDF]`, and that sentence is rendered verbatim as
the panel's footnote.

### 11.7 The bank retains the credit decision `[PDF]` — a hard product rule

Both PDFs close with it: *"the bank retains the lending decision"* / *"the bank retains the credit
decision."* ClimaVex therefore **never** renders an approve/decline verdict, a go/no-go, a credit
score, a recommended limit presented as a decision, or an automated eligibility outcome. It
presents dated cash flows, gaps, exposures and their assumptions, and stops.

Enforced concretely: no API endpoint returns a decision field for the twin; the scenario and
finance panels carry the footnote *"Decision support only — the bank retains the credit
decision."*; and a test asserts no twin response body contains `approved`, `declined`, `verdict`
or `eligibility`. *(The legacy `LoanDecision` table stays untouched — it records a decision a human
banker already made, which is a different thing from the product making one.)*

**Crop-mix vulnerability** `[U]` is revenue-weighted, never count-based:
```
expectedRevenue(section) = areaHa × yieldTPerHa × priceTryPerT
exposedShare = Σ expectedRevenue(affected sections) / Σ expectedRevenue(all sections in season)
```
The panel shows the numerator, the denominator, the full list of affected sections, the hazard or
sensitive window driving it, and the assumption-set version — with placeholder sensitivity rules
clearly labelled.

### 11.5 Shared-resource de-duplication `[U]`
`Resource → ResourceLink → Section → Farm → Loan`. Portfolio totals aggregate over a
`Set<loanId>`, so a loan touching three disrupted sections — or a borrower holding two affected
farms — is counted **once**. The panel shows `distinct loans` and `distinct borrowers` alongside
the total, so the de-duplication is visible rather than merely asserted.

### 11.6 Acceptance fixtures `[U]` — each becomes a unit test

**F1 — the stated acceptance example.** Due `TL300,000`. Available after costs and other
obligations `TL180,000`. → **shortfall on the due date = `TL120,000`**. Assumed eligible insurance
payout `TL120,000` arriving **after** the due date. → the due-date row still reads
`shortfall = TL120,000`; the payout appears as an inflow on its own later receipt date. Asserted
exactly.

**F2 — September repayment, November proceeds.** Repayment due 2026-09-15; crop-sale receipt
2026-11-20. The September row shows a shortfall; November shows the inflow. Deficit carries
forward once.

**F3a — the Approved-Features canal** `[PDF]`. *"Three fields across two borrowers share one
canal."* One `CANAL_CONNECTION` supplying 3 sections across 2 farms held by **2 borrowers** with 3
loans (one borrower holds two). A supply-restriction scenario highlights all 3 fields; the
portfolio total counts **3 distinct loans and 2 distinct borrowers**, not 3 borrowers.

**F3b — the Bank-Benefits canal** `[PDF]`. *"Five borrowers rely on one irrigation canal."* One
canal, **5 borrowers**, 7 loans across 9 sections. Every connected loan is highlighted and each is
counted **exactly once**. This is the de-duplication stress case.

**F4 — concentration** `[PDF]`. *"Three crops appear diversified, but 70% of expected revenue
depends on fields vulnerable during the same dry period."* A farm with **3 crops** across 6
sections where **70% of expected revenue** sits in one sensitive window. `exposedShare` must
compute to `0.70 ± 0.005`, and the panel must show the numerator, denominator and section list —
demonstrating precisely the PDF's point that crop *count* is not diversification.

**F5 — unequal division** `[PDF]`. *"A farmer outlines 20 hectares, assigning 12 to wheat and 8 to
maize."* A 200,000 m² parcel divided **60% / 40%** → 120,000 m² Buğday, 80,000 m² Mısır, each
within `EQUAL_AREA_TARGET_REL`. Exercises manual/percentage mode (§8.2), proves N is independent of
crop count, and is step 6-alt of the demo script.

All fixtures are **illustrative test fixtures, not claims about real farms**, seeded with
`isDemo = true`, and their numbers are taken from the PDFs' own illustrative examples.

---

## 12. Milestones

Each milestone ends green: `tsc`, lint, the shadow grep, its own tests, and a working `npm run dev`.

| M | Name | Depends | Definition of done |
|---|---|---|---|
| **M0** | Foundations | — | PostGIS enabled + first migration; Prisma switched from `db push` to `migrate`; zod, Decimal, Vitest, Playwright, Auth.js, Geoman-free, turf, polygon-clipping, proj4 installed; ESLint config added (**none exists today**) + `lint`/`test` scripts; **all 11 shadow sites purged** + CI grep; new shadcn primitives added shadow-free; **`license-checker` in CI passing the §4.2 audit**; `PLAN.md` committed. |
| **M1** | Geometry core | M0 | `domain/geometry/*` complete and **pure** — projection, validation, measurement, `subdivide()`. Every §8.3 edge case has a passing test. Determinism test: 1,000 repeats, byte-identical. Property test: 200 random valid polygons × N∈[2,24] all satisfy §8.4. **No UI yet.** |
| **M2** | Map workspace | M0 | Root `/` is the Anatolia map, no onboarding. Sidebar + inspector + layer control + legend + demo/verified distinction. Geoman draw/edit/drag/delete. Live area in m²/ha/dekar. `geo-adapter.ts` is the only lat/lng↔lng/lat conversion. Configurable extent; "Zoom to Konya" works. |
| **M3** | Cadastral identity | M2 | Parser accepts all three formats; ada/parsel stored separately with `originalInput`; full reference renders; **ambiguous `463:21` never auto-selects** (409 + disambiguation UI); GeoJSON import with field-mapping confirmation; unverified drafts; demo parcels seeded. |
| **M4** | Subdivision + persistence | M1, M3 | Enter N → preview → adjust → save → **reload → identical layout**. Atomic transaction; server invariants; 409 on version conflict; undo/redo; N-change and geometry-change policies with the confirm dialog. **This is journey J1 end-to-end.** |
| **M5** | Crops + seasons + timeline | M4 | Five-crop catalogue seeded with calendars and editable assumptions; per-section fields incl. sale date separate from harvest; timeline scrubbing restyles the map and panels consistently; stages derived from calendars and **never** presented as AI observations. |
| **M6** | Resources | M5 | Place wells/pumps/canals; link to sections across farms and borrowers; disruption highlights all connected sections and loans; portfolio totals de-duplicated with distinct-loan and distinct-borrower counts shown. |
| **M7** | Financial engine | M5 | `domain/finance/*` complete; loans, schedules, costs, receipts, reserves, obligations, insurance; **F1–F4 all passing**; three measures rendered distinctly; dated ledger table in the inspector. |
| **M8** | Placeholder + scenarios | M6, M7 | `ScenarioImpactProvider` + `DeterministicRulesProvider v1.0.0`; weather datasets with provenance and date alignment incl. missing observations; baseline vs scenario comparison; immutable `ScenarioRun` snapshots; crop-mix vulnerability; banner everywhere; **app boots and the full demo runs with no AI service**. |
| **M9** | Bank views + demo | M8 | Legacy pages restyled and re-pointed; `BankAccessGrant` enforced with the **object-class split** (bank writes finance, never geometry) and per-row attribution; portfolio resource-exposure view; §11.7 no-verdict rule asserted; CSV/JSON/print exports carrying the banner, demo markers and licence attribution; **Protomaps PMTiles pipeline built and serving the Türkiye extract**; **§13.2 demo script passes as a Playwright E2E**. |

Critical path: **M0 → M1 → M4 → M7 → M8 → M9**. M2/M3 and M5/M6 parallelise across two developers.

---

## 13. Seed data and demonstration script

### 13.1 Seed `[A]`
Extend `prisma/seed.ts`, preserving its existing fully-deterministic character (**zero
`Math.random` today — keep it that way**) and its pattern of calling the same domain functions the
API uses, so seeded and live data always agree.

- **Users:** `demo-farmer@climavex.test` (FARMER), `bank@climavex.test` (BANK_USER),
  `admin@climavex.test`. Fixed bcrypt hashes; dev-only passwords in `.env.example`.
- **4 Konya demo farms** with hand-typed geometry near Çumra/Karatay (~37.87 N, 32.49 E),
  deliberately covering the edge cases: one **concave**, one **with a hole**, one
  **multipolygon**, one simple convex. All `isDemo = true`, `UNVERIFIED_DRAFT`.
- **Demo cadastral parcels** including a **deliberate `463:21` collision** across two different
  mahalle, so the disambiguation path is demonstrable.
- **Crops:** the five of §9.2 with calendars, sensitive windows and demo assumptions.
- **Seasons:** 2025-26 active, 2024-25 historical.
- **Sections:** produced by calling the **real `subdivide()`** — not hand-typed — proving the
  algorithm is reproducible.
- **Resources:** two canals — one for **F3a** (3 fields / 2 borrowers) and one for **F3b**
  (5 borrowers / 7 loans), both straight from the PDFs; plus 2 wells and a pump.
- **Finance:** loans with schedules, costs, receipts, reserves, obligations; F1's
  TL300,000 / TL180,000 / TL120,000 numbers exactly; F2's Sep-due / Nov-receipt pair; policies with
  `isDemoAssumption = true`. A seeded `BankAccessGrant` with `FINANCE_WRITE` so the bank-user
  journey is demonstrable.
- **F5 parcel:** a 20 ha (200,000 m²) field pre-split 12 ha Buğday / 8 ha Mısır, per PDF feature 01.
- **Weather:** one `DEMO_SYNTHETIC` dataset labelled **"demo weather scenario"** — which
  **never claims to represent a real historical year** — as the offline default, so the demo needs
  no network. Plus a working importer for **Open-Meteo ERA5** (CC-BY-4.0) and **NASA POWER**
  (public domain), both free and key-less, each storing its provenance and attribution string.

`npm run db:reset` = `migrate reset` + `seed`. Idempotent and repeatable.

### 13.2 Demonstration script `[U]` — also the M9 Playwright E2E

1. `npm run db:reset && npm run dev` → open `/`.
2. **Anatolia map loads immediately**, no onboarding. Banner: *"Demo simulation — AI model not connected."*
3. Click **Zoom to Konya demo farms**.
4. Sign in as the demo farmer. Draw a new polygon; drag a vertex; read
   `43,500 m² · 4.35 ha · 43.5 dekar`.
5. Enter `463 ada, 21 parsel` → the ambiguity prompt appears → pick Konya / Çumra / Alibeyhüyüğü →
   header shows `Konya / Çumra / Alibeyhüyüğü / 463:21`, badged **Unverified draft**.
6. Enter **N = 6** → preview → 6 equal-area sections A–F, each within 1% of target, invariant panel green.
7. Assign crops: A,B,D = Buğday · C,E = Arpa · F = Şeker pancarı. *(6 sections, 3 crops — N is
   independent of crop count.)*
8. Drag the C/D boundary; both sections update together; invariants stay green. **Save.**
9. **Reload the browser. The layout returns identically** — geometry, crops, areas, cadastral reference.
10. Scrub the season timeline Oct → Jun: sections restyle by stage, sensitive windows highlight,
    the finance "as of" date follows.
11. Place a canal connection; link it to sections on this farm **and** on a second borrower's farm.
12. Run **Resource disruption, 14 days** → all connected sections highlight; the portfolio panel
    reports **4 distinct loans, 3 distinct borrowers** — each counted once.
13. Run **Weather replay** on the demo dataset → baseline vs scenario side by side, with ruleset
    version `v1.0.0`, input hash, and the demo-weather provenance shown.
14. Open **Finance**: the TL300,000 due date shows a **TL120,000 shortfall**; the TL120,000
    insurance payout sits on its own later receipt date and **does not** close that gap.
15. Open **Crop-mix vulnerability**: revenue-weighted exposed share with numerator, denominator and
    affected sections listed.
16. Sign out; sign in as the **bank user** → only granted borrowers are visible → open the twin:
    geometry and crop controls are absent, and a direct `PUT /api/farms/:id/layout` returns
    **403**. But the Finance tab is **editable** `[PDF]` — add a loan term and an insurance policy,
    save, and both appear attributed as *"added by Ziraat demo on <date>"*.
17. Run the **F3b canal disruption** across the portfolio → 5 borrowers, 7 loans, each counted once.
18. Confirm no screen anywhere shows an approve/decline verdict — only dated gaps, exposures and
    their assumptions, with the footnote *"the bank retains the credit decision."* `[PDF]`
19. Export the scenario to CSV → the banner, demo markers and the OSM/Open-Meteo attribution
    strings are all present in the file.

---

## 14. Tests

| Area | Tool | What is asserted |
|---|---|---|
| **Geometry** | Vitest + fast-check | Every §8.3 edge case: concave, hole, multipolygon, self-intersecting (422), tiny sections, N>24, escape, overlap, gap, area conservation, shared-boundary edits. Property test: 200 random valid polygons × N∈[2,24] satisfy all §8.4 tolerances. Golden-file test on the 4 seeded farms. **Unit conversion** m²/ha/dekar. **Coordinate-order test**: a known Konya polygon must yield ~43,500 m², catching any lat/lng swap (a swapped polygon lands in the Indian Ocean and fails hard). |
| **Persistence** | Vitest + test Postgres | Save → reload → deep-equal. Atomicity: force an invariant breach mid-transaction, assert **zero** partial rows. Version conflict → 409 with current state. Re-division preserves crop assignments by ordinal. `ScenarioRun` UPDATE/DELETE raises. |
| **Authorization** | Vitest (integration) | A table-driven matrix of {FARMER-owner, FARMER-other, BANK_USER-granted-READ, BANK_USER-granted-FINANCE_WRITE, BANK_USER-ungranted, ADMIN, anonymous} × every mutating route → expected 200/401/403. **The object-class split is the core assertion: a bank user with `FINANCE_WRITE` gets 200 on loans/cash-flow/insurance and 403 on geometry, sections, crops and resources.** A `READ`-only grant gets 403 on all writes. Revoking a grant immediately 403s. Static tests assert no guard contains a demo/bypass branch, and that no twin response body contains `approved`/`declined`/`verdict`/`eligibility` (§11.7). |
| **Licensing** | Vitest + CI | `license-checker` fails the build on any non-permissive or unknown licence, pinning the §4.2 audit. A render test asserts the `© OpenStreetMap contributors` and Open-Meteo CC-BY attribution strings appear in the map control and in every export footer. |
| **Scenario repeatability** | Vitest | `estimate()` × 100 → byte-identical. `inputHash` stable across key order, whitespace and coordinate re-rounding. A golden fixture pins the hash, so any rule change must be a deliberate version bump. No `Math.random`/`Date.now` in `domain/scenario/` (AST check). |
| **Financial timing** | Vitest | **F1–F4** exactly as specified in §11.6. Plus: late payout never reduces an earlier shortfall; deficit carries forward once and only once; no reserve/receipt/cost/obligation is counted twice (assert `Σ inflows − Σ outflows − Σ paid == final balance`); Decimal precision (no float drift over 200 events); Istanbul-timezone boundary (an event at 23:59 Istanbul on the due date counts on that date). |
| **Provider boundary** | Vitest | `domain/finance/` has **no import path** to `domain/scenario/`. The app boots and all four fixtures pass with `PROVIDER=deterministic` and no network. |
| **E2E** | Playwright (Chromium pre-installed) | The full §13.2 script, including the reload-and-recover step and the bank-user 403. |

Coverage gate: **90% on `src/domain/`**, which is where correctness actually lives.

---

## 15. Risks and unresolved assumptions

| # | Risk / open question | Recommended default |
|---|---|---|
| R1 | **Konya crop ranking unverified** (all sources egress-blocked) | Ship the provisional five, labelled as such, with no ranking claim. Catalogue is DB-seeded so a swap is a seed edit. Verification is an M0 task. |
| R2 | **Geoman Split is Pro (~€999/yr)** | Never call Split. Our own algorithm (§8) is required regardless — Split cuts by a drawn line, not into N equal areas. Free edition (MIT) covers draw/edit/drag/cut/rotate. |
| R3 | **No authorized TKGM access**; their terms forbid unpermitted programmatic use and commercial use of results | Demo parcels + manual entry + drawing + GeoJSON import. Adapter interface defined, unimplemented. |
| R4 | **PostGIS unavailable on the chosen host** | Verify in M0 before any geometry code. Fallback: `jsonb` + turf, with `server/geo/` swapped behind the same repository interface — which is why geometry access is isolated there. |
| R5 | **Prisma has no PostGIS types** | `Unsupported()` + `$queryRaw`, confined to `src/server/geo/` with its own integration tests. |
| R6 | **Concave cuts yielding MultiPolygon sections** | Keep as one multipart section (`isMultipart`), preserving area exactly. Revisit only if users object. |
| R7 | **Lat/lng order confusion** — the classic Leaflet↔GeoJSON bug | Single adapter module, lint rule, and a coordinate-order test whose failure mode is unmissable. |
| R8 | **Float money creeping in from legacy code** | New financial tables are `NUMERIC(18,2)`/Decimal. Legacy float fields are not reused by `domain/finance/`. A lint rule bans `number` in finance signatures. |
| R9 | **Timezone off-by-one on due dates** | All dated logic through `toIstanbulDate()`; DB columns are `DATE`, not `TIMESTAMP`; boundary test at 23:59. |
| R10 | ~~OSM tile policy forbids production use~~ **RESOLVED — free answer found** | **Protomaps PMTiles self-hosted** (BSD-3 / CC0 / ODbL): one static file, no tile server, no key, no bill. OpenFreeMap as the zero-setup alternative. OSM tiles dev-only. Config-switchable from M2. §4.2. |
| R11 | ~~No free redistributable historical weather~~ **RESOLVED — free answer found** | **Open-Meteo ERA5** (CC-BY-4.0, **commercial use permitted**, no key, 1940→present) as the primary import, **NASA POWER** (US public domain, purpose-built agroclimatology, 1981→present) as the second. Still ship the labelled *"demo weather scenario"* synthetic set as the offline default, so the app never depends on a network call. Real imports carry provenance + attribution. |
| R12 | ~~PDFs unavailable~~ **RESOLVED** | Both supplied and read; incorporated as `[PDF]`; the one conflict is recorded in §16.2 and resolved in favour of the user's request. |
| R16 | **PostGIS is GPL-2.0** | Free and unrestricted for a hosted app (no linking, no distribution). Take legal advice only if ClimaVex is ever shipped as an on-premise appliance bundling PostGIS. R4's all-MIT `jsonb` fallback is the insurance. §4.2. |
| R17 | **Bank finance-write could be mistaken for the bank editing the farm** | Object-class split in §6.3 + per-row attribution (*"added by <bank> on <date>"*) + farmer-controlled `FINANCE_WRITE` grant scope, so sharing a twin for viewing never hands over the ledger. |
| R18 | **Someone later adds an approve/decline verdict**, breaching the PDFs' "bank retains the decision" | §11.7 rule + a test asserting no twin response contains `approved`/`declined`/`verdict`/`eligibility`. |
| R13 | **Scope is large for a small team** | Milestones are independently demoable; M0–M4 alone deliver the headline farm-builder journey. |
| R14 | **`N_MAX = 24` may be wrong for real parcels** | Env-configurable; revisit after pilot feedback. |
| R15 | **Legacy and twin models could drift** | `Region.farmId` bridge; M9 re-points bank views at `Loan`. No legacy table is dropped, so rollback stays cheap. |

---

## 16. Future AI integration — *outside the current scope*

### 16.1 The adapter

When the trained model is ready, integration should be **only** this:

1. Implement `ScenarioImpactProvider` as `TrainedModelProvider` against the unchanged
   `IMPACT_CONTRACT_VERSION = "1.0.0"` contract.
2. Validate every response with the existing zod `ImpactResponse` schema; on mismatch, reject and
   fall back to the deterministic provider **with a visible notice**.
3. Apply a 5 s timeout, one retry, and typed errors (`ProviderTimeout`, `ProviderSchemaError`,
   `ProviderUnavailable`) that degrade gracefully — never a silent blank panel.
4. Run the existing **contract test suite** — the same golden fixtures the deterministic provider
   passes — asserting schema conformance, section-id coverage, and delta bounds.
5. Set `providerType: "trained-model"`, at which point the *"Demo simulation — AI model not
   connected."* banner disappears **automatically**, everywhere, because it is derived from that
   field rather than hardcoded.
6. Roll out behind `PROVIDER=trained-model` per environment, with the deterministic provider
   retained permanently as the fallback and as the reference implementation for the tests.

**What must not change:** the financial ledger. A model supplies estimated yield and revenue
*percentages*; cash-flow arithmetic, repayment timing, insurance payout dating, and the three
distinct exposure measures stay deterministic and independently tested. That boundary is the
reason this phase is safe to build now.

**Not in this phase:** no model connector, endpoint, key, SDK, hosting, training pipeline, or
substitute AI provider. `PROVIDER=deterministic` is the only accepted value and the boot check
fails on anything else.

### 16.2 Where the PDFs and the user's request conflict

The PDFs are product reference material; where they diverge from the user's request, the request
wins. Two divergences, both resolved and implemented as stated:

| # | PDF says | Request says | Resolution |
|---|---|---|---|
| C1 | Feature 06: combine cash flows with **"actual policy triggers, limits and payout timing"**, context *"TARSIM 2026 yield-insurance terms"* | *"Do not hardcode illustrative insurance assumptions as current TARSIM rules"*; treat as user-entered or fixture data unless verified | **Request wins.** Fixture/user-entered only, every field carrying `source`, `isDemoAssumption` and `verifiedAt`. The model can hold verified terms the day someone supplies them; this phase ships and claims none. §11.3 |
| C2 | Feature 05 implies replaying **real** past seasons (*"a past dry season is replayed"*) | Synthetic fixtures *"must say 'demo weather scenario', not claim to represent a real historical year"* | **Request wins, and we can satisfy both.** The bundled default is explicitly synthetic and labelled; free real reanalysis (Open-Meteo ERA5, NASA POWER) is importable with provenance, at which point a genuine past season can be replayed honestly. §13.1, R11 |

Everything else in the PDFs is either already required by the request or additive, and is carried
into §3 as `[PDF]` rows P1–P13. The single substantive thing the PDFs *added* that the request did
not state is **P1** — that banks write loan terms, cash flows and insurance details onto the twin —
which corrected §6.3 from read-only to an object-class split.

---

## Verification

```bash
npm install
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgis/postgis:15-3.4   # or a PostGIS host
npx prisma migrate dev && npm run seed
npm run test            # Vitest: geometry, persistence, authz, scenario, finance F1–F4
npm run test:e2e        # Playwright: the full §13.2 demo script
npm run lint && npx tsc --noEmit
rg 'shadow-(sm|md|lg|xl|2xl)?\b' src/ | grep -v 'print:shadow-none'   # must be empty
npm run dev             # http://localhost:3000 → Anatolia map, no onboarding
```

Manual acceptance: walk §13.2 steps 1–17. The two that matter most are **step 9** (reload recovers
the saved layout — proving this is not a mockup) and **step 14** (the late insurance payout does
not erase the due-date shortfall — proving the financial timing is right).

**Ship gate:** the entire script above must pass with **no AI service running and no model
credentials present** in the environment.

---

# Revision 3 — implementation record

Revisions 1 and 2 are the plan. This section records what was **actually built
and verified**, and where reality differed from the plan. Written after the
fact, from the working system.

## Delivered

| Area | State |
|---|---|
| Database | PostgreSQL 16.15 + **PostGIS 3.4**, 23 new tables, 2 migrations |
| Geometry | GeoJSON in, PostGIS-derived `geom` / `areaM2` / centroid via trigger; GIST indexes |
| Subdivision | Recursive area-bisection in EPSG:5255; deterministic; N = 1…24; equal or custom shares |
| Domain layer | `geometry`, `finance`, `scenario`, `vulnerability` — pure, no Prisma or Next imports |
| Auth | Signed-cookie sessions in a DB `Session` table, bcrypt, 4 roles |
| Authorization | Object-class split, enforced in every route handler |
| API | 18 route handlers, zod-validated, uniform `{ error, code, details }` |
| UI | Map workspace: sidebar, inspector (5 tabs), season timeline, layers, legend, sign-in |
| Seed | 4 Konya farms covering convex / concave / holed / disconnected geometry |
| Tests | **73 automated tests** + 2 scripted browser journeys, all passing |

## Verified behaviour

- **F1 acceptance example** reproduces exactly, end to end and on screen:
  ₺300,000 due, ₺180,000 available, **₺120,000 shortfall**, with the assumed
  eligible ₺120,000 payout arriving 2026-11-14 and *not* closing that gap.
- **F2** September due / November proceeds: deficit carries forward exactly once.
- **F3** shared-resource exposure de-duplicates — the Meram well reports
  ₺700,000 against a naive per-section sum of ₺1,400,000.
- **Persistence**: divide into 9 → assign crops → save → **full browser reload**
  → 9 sections and 9 polygons recovered.
- **Optimistic locking**: a stale write returns 409 naming the current version.
- **Authorization matrix** (probed over HTTP): farmer-owner 200 / other farmer
  403 / anonymous 401 on read; geometry writes 403 for bank *and* insurer;
  finance writes 201 for the bank, 403 for the insurer's read-scope grant.
- **`463:21` ambiguity**: two demo parcels share it across different mahalle;
  the API returns 409 with both candidates rather than guessing.
- **Determinism**: subdivision byte-identical over 50 runs; scenario and risk
  hashes stable; an unchanged re-run reuses its immutable snapshot.
- **Immutability**: `UPDATE` on a `ScenarioRun` raises at the database level.
- **No shadows**: CI guard greps the tree and fails on any `shadow-*` class.

## Where reality differed from the plan

| # | Plan said | What happened |
|---|---|---|
| D1 | Auth.js credentials + DB sessions | **Not possible** — Auth.js forces the JWT strategy with its Credentials provider, so database sessions cannot be combined with it. Implemented directly (~100 lines) to actually deliver credentials *with* revocable server-side sessions. |
| D2 | Subdivision tolerances as planned | Sections are now additionally **clipped to the parent and to previously-emitted sections**, because the project→unproject round-trip left millimetre drift on shared boundaries that integrated into ~20 m² of apparent overspill. Overlap is now exactly **0** by construction rather than merely within tolerance. |
| D3 | Coordinates at 7 dp | Raised to **8 dp**. At 7 dp (~1.1 cm) independent rounding of a shared vertex produced ~1.4 m² of phantom overlap along a 2 km edge — inside the physical noise floor but enough to trip the 1 m² invariant. |
| D4 | Containment via `ST_Within(ST_Buffer(geography))` | Replaced. Buffering a geography reprojects and approximates, and was not a reliable envelope. Now measures the **area lying outside the parent** directly. |
| D5 | — | `polygon-clipping` ships a CJS build with named exports and an ESM build with only a default. A namespace import worked under tsx and silently yielded `undefined` in the production bundle. Both shapes are now resolved once, and clipping failures **throw instead of returning empty geometry** — the original silent catch is what disguised the bug as a "degenerate result". |
| D6 | — | Re-dividing a field cascade-deleted its **resource links**. They now survive by ordinal, exactly as crop assignments do; otherwise changing N silently detaches a farm from its canal and under-reports shared exposure. |
| D7 | — | A malformed request body returned 500. Now 400. |
| D8 | — | The first no-shadow CI guard used an escaped `\\b` and matched nothing, so it passed vacuously. Caught by testing the guard against a known-bad file; now verified to fail on a real shadow. |

## Known limitations

- **Basemap tiles are blocked in the build container**, so the map renders its
  geometry over a plain background here. The app detects repeated tile errors
  and says so rather than looking broken. Tiles load normally on a machine with
  outbound access to the tile host.
- Turkish crop statistics remain **unverified** (§9); the catalogue ships
  explicitly provisional.
- The season timeline restyles panels and the map cursor, but does not yet
  animate crop-stage fills on the polygons themselves.
- i18n covers the legacy dashboard; the twin workspace is English-only so far.
- No automated accessibility audit has been run.
