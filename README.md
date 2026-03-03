# KKR Portfolio Intelligence Pipeline (PoC)
Once the core pipeline is stabilized, we move from **Data Collection** to **Insight Generation**:
Hosted on - https://kkr-portfolio-scraper-backend.onrender.com/api 
---

## ## Problem Statement

A GP's (KKR) portfolio pages offer rich information for manual browsing, but lack the structure required for deep analysis. Manual data entry is non-scalable and prevents **automation, historical tracking, or integration** with internal dashboards and AI agents. This project bridges the gap between unstructured web content and actionable intelligence.

## ## Goal

Deliver a robust service that:

1. **Automates Extraction**: Collects portfolio data from KKR’s JSON endpoints.
2. **Normalizes Storage**: Implements a flexible **MongoDB schema** designed for multi-GP expansion.
3. **Exposes Intelligence**: Provides **REST endpoints** for advanced filtering, searching, and analytics.
4. **Operational Excellence**: Supports **idempotent runs**, change tracking, and seamless local deployment via **Docker**.

## ## Use Cases

-  **Analysts**: query and export up‑to‑date(wth version tracking) portfolio slices (by asset class, industry, region) and view aggregates for reporting.
-  **Engineers/AI**:  clean schemas to power automated agentic workflows and deal-sourcing tools.
- **People Mapping** : portCos mapped to decison makers to predict trends and decisions
---

## ## Current Tech Stack & Architecture

* **Framework**: NestJS (Modular, Scalable TypeScript)
* **Database**: MongoDB (Flexible JSON-native storage)
* **API**: Swagger/OpenAPI for documentation and testing.
* **DevOps**: Docker + Docker Compose (With Watch mode).
- Frontend scope -  a dashboard ui with qwen support to allow human language querying on our Mongo via NLP 
---

## ## Data Model Overview
 - Read Schema - 
    - person
    - portfolio (hardcoded sourceGP as KKR for now - change when scaling)

## ## Getting Started

1. Setup Environment
Clone the repository and create a .env file and add GEMINI api key:

MONGODB_URI=mongodb://localhost:27017/kkr-portfolio
PORT=8080
GEMINI_API_KEY=

2. Quick Start (Automated) on Bash-
just -> npm run setup

3. Manual Spin Up
If you prefer manual control:

Bash
docker-compose up --build
Navigate to http://localhost:3000/api/ to manually trigger syncs 

## ## Project Status & Roadmap

### **Phase 1 Task Sumary**

| Task | Category | Status | Notes |
| --- | --- | --- | --- |
| **NestJS Scaffold** | Infrastructure |  Complete | Project initialized with TypeScript. |
| **MongoDB Connection** | Infrastructure |  Complete | Mongoose integration active. |
| **Docker Compose** | Infrastructure |  Complete | Includes NestJS (Watch Mode) + Mongo. |
| **KKR API Seeder** | Core Engine |  Complete | Handles pagination & upsert logic. |
| **REST Endpoints** | API Access |  Complete | List, Filter, and Detail views active. |
| **Base Schema** | Data Model |  Complete | Basics + Investment fields implemented. |
---


## Phase 2: The "data enrichment" Phase -

* **Step 2.1:** The People Engine (P1)
- Fetch the paginated JSON from the KKR People API. (done)
    - it uses a unique slug to indentify people - slug uitli = name+sourceGP.. will need more robust ids for scale (preferably a public unique id)
    - bio page will lead us to description.
    - these names wiht KKR tag can be used to fetch content from secform4.com to get personal investment details
    - tracxn has some enriching portco-peopel mapping data



## ## People Engine Architecture - 

KKR People List Page
        │
        ▼
  Scraper Service (existing)
  fetches /our-people/{slug}
        │
        ▼
        BATCH people
  Gemini Flash (free tier)
  structured extraction prompt
  → returns JSON: { portcos[], role, dates, priorFirms, education }
        │
        ▼
  Enrichment Service (NestJS)
        ├─► Upsert Person (rawBiography + parsed fields)
        ├─► Fuzzy match portCo name → Portfolio collection
        │     (if no match → create stub Portfolio with syncStatus: 'stub')
        └─► Upsert PersonPortCo junction documents


Gemini Batching - batch 50 people. KKR has ~600 people → only 12 Gemini calls total for a full scrape. Well within 1500/day free limit. Leaves room for retries without burning quota.
The prompt returns an array of 50 results keyed by personSlug so you can match results back to inputs exactly.



syncStatus State Machine
[Existing API]                          [New Enrichment Pipeline]
      │
      ▼
 'pending'           ← person created, no bio yet
      │
      ▼ (Phase 1: bio scraper)
 'bio_fetching'      ← actively being fetched right now (crash recovery)
      │
      ├──(success)──►'bio_fetched'     ← rawBiography written, queued for Gemini
      │
      └──(fail)─────►'bio_failed'      ← HTTP error on bio page, retryable
                          │
                          ▼ (Phase 2: Gemini batch)
                     'enriching'        ← in active Gemini batch (crash recovery)
                          │
                     ┌────┴────┐
                     ▼         ▼
                 'synced'   'enrich_failed'  ← Gemini failed or parse error



## The pipeline has 2 phases, triggered manually via HTTP.
### Phase 1 — Bio Fetching
POST /enrichment/run → EnrichmentService.runBioFetchPhase()

Queries MongoDB for all people with syncStatus: pending | bio_failed who have a sources.kkrUrl
Marks them all bio_fetching immediately (crash recovery — if server dies mid-run, these won't get stuck)
Hands the batch to KkrPersonScraperStrategy.fetchBioBatch() which runs 3 concurrent HTTP requests to KKR bio pages, with 1500ms + random jitter between batches, retrying up to 3x with exponential backoff (3s → 9s → 27s)
On success: writes rawBiography text to the Person doc, sets bio_fetched
On failure: sets bio_failed with the error message — retryable next run

### Phase 2 — Gemini Enrichment
Runs immediately after Phase 1 in the same runFullPipeline() call.

It now correctly uses 3 parallel "workers" to handle batches of 10 people, which should prevent those 60000ms timeout errors.

Queries all people with syncStatus: bio_fetched | enrich_failed
Marks them enriching
Sends to GeminiBioParserService in batches of 10 with 2s between calls — for 1027 people that's ~103 Gemini API calls total (NEEDS optimisation)
Gemini returns a JSON object keyed by personSlug with portcos[], boardRoles[], priorFirms[], education[]
For each portco name returned: PortfolioMatcherService fuzzy-matches it against your Portfolio collection using Dice coefficient similarity (threshold 0.75). Hit → links to real Portfolio. Miss → creates a stub Portfolio
Upserts PersonPortco junction documents with role, dates, match confidence
Sets person to synced with lastEnrichedAt timestamp

## Output Phase 2- 
### File Description Phase 2 - additions(New)
      person-portco.schema.ts - junction collection
      kkr-person-scraper.strategy.ts - fetches bio HTML per person
      gemini-bio-parser.service.ts - batches 50 people → Gemini → structured JSON
      portfolio-matcher.service.ts - fuzzy match portco names → Portfolio docs
      enrichment.service.ts - orchestrates the whole pipeline
      enrichment.controller.ts - HTTP trigger endpoints
      enrichment.module.ts - wires it all together
      person-portco.service.ts + person-portco.controller.ts + person-portco.module.ts
  **Updated:**
      person.schema.ts - expand syncStatus to full state machine
      app.module.ts - add EnrichmentModule, PersonPortcoModule`

note-  gp-person-scraper.interface.ts — this defines the contract that KkrPersonScraperStrategy (and future scrapers for other GPs like Apollo, Carlyle etc.) must implement. it is the interface that makes the strategy pattern actually work when i will scale beyond KKR.

**The pipeline is fully idempotent — you can re-run it and it'll only pick up pending/bio_failed/enrich_failed people, skipping anyone already synced.**




# API Documentation

## Scraper
Endpoints for data ingestion and synchronization from source targets.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/scraper/sync-kkr` | Scrape KKR portfolio companies, upsert into Portfolio collection |
| POST | `/scraper/sync-kkr-people` | Scrape KKR people list pages, upsert into Person collection with syncStatus: pending |

## People
Endpoints for retrieving and searching personnel records.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/people` | All people, sorted by name. Supports `?limit=100` |
| GET | `/people/count` | Total person documents |
| GET | `/people/search` | Case-insensitive name search via `?name=` |

## Enrichment
Endpoints for the AI processing pipeline and status monitoring.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/enrichment/run` | Main trigger. Runs full pipeline (Phase 1 + Phase 2) in background. Returns immediately. |
| POST | `/enrichment/run/bio-fetch` | Phase 1 only — fetch bio HTML for pending/bio_failed people |
| POST | `/enrichment/run/enrich` | Phase 2 only — run Gemini on bio_fetched/enrich_failed people |
| GET | `/enrichment/status` | Pipeline health — count of people per syncStatus + total PersonPortco docs |

## Person ↔ PortCo Relationships
Endpoints for managing the junction records between individuals and portfolio companies.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/person-portco` | All junction records. Supports `?limit=100` |
| GET | `/person-portco/count` | Total relationships created |
| GET | `/person-portco/by-person/:personSlug` | All portcos linked to a specific person |
| GET | `/person-portco/by-portfolio/:externalId` | All people linked to a specific portfolio company |


Note/UPDATE--
Strategy: Replaced the recursive next() with a while loop worker. This prevents the "hanging" or "crashing" you might see after a few dozen items.

Service: Added bio_fetching to the query to ensure that if the process dies, it doesn't leave those records in "limbo" forever.

Performance: Switched to bulkWrite to reduce the number of trips to the database from 1,079 to 1.

# Engineering Roadmap - TO DOS:
- granularise office location to(city, country, region..) for each person

## Phase 3: Technical Debt & Status Fixes (Current)
Focus: Stability, concurrency, and developer experience.

### Enrichment & Syncing
* Enrichment Locking: Implement record locking by marking records as 'enriching' before API dispatch to prevent worker collisions.
* Failure Handling: Ensure failed batches are explicitly tagged 'enrich_failed' with a 'syncError' payload; eliminate false-positive synced statuses.

### Data & Codebase Cleanup
* Stub Management: Standardize auto-generated portfolio stubs with source: 'people' and investmentStatus: 'inactive'.
* Mongoose Refactor: Update all findOneAndUpdate calls to use { returnDocument: 'after' } to resolve deprecation warnings.

### Logging & Observability
* Progress Tracking: Update GeminiBioParserService to log global progress (e.g., Batch 5/103) instead of local chunk progress.

---

## Phase 4: Data Expansion & Efficiency
Focus: New data verticals, auditability, and LLM optimization.

### Data Governance
* Delta Tracker: Implement a versioning system to track change history (user, timestamp, and field-level diffs) for person/company records.

### Scoping & Integration
* SEC Filing Scraper: Build a dedicated worker for SEC Edgar to track institutional ownership and executive movements.
* Multi-Source Integration: Deploy secondary scraping layers via Bing (news/web) and Apollo API (contact/firmographic data).

### Gemini Optimization
* Efficiency: Refine prompt token usage and optimize batch sizes for cost/speed balance.
* Resiliency: Increase timeouts to 120s to minimize unnecessary retries on complex reasoning tasks.