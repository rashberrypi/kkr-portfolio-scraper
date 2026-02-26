# KKR Portfolio Intelligence Pipeline (PoC)

A production-ready data pipeline and REST API designed to transform KKR’s public portfolio data into a structured, trackable, and programmatically accessible asset.

---

## ## Problem Statement

KKR’s portfolio pages offer rich information for manual browsing, but lack the structure required for deep analysis. Manual data entry is non-scalable and prevents **automation, historical tracking, or integration** with internal dashboards and AI agents. This project bridges the gap between unstructured web content and actionable intelligence.

## ## Goal

Deliver a robust service that:

1. **Automates Extraction**: Collects portfolio data from KKR’s JSON endpoints.
2. **Normalizes Storage**: Implements a flexible **MongoDB schema** designed for multi-GP expansion.
3. **Exposes Intelligence**: Provides **REST endpoints** for advanced filtering, searching, and analytics.
4. **Operational Excellence**: Supports **idempotent runs**, change tracking, and seamless local deployment via **Docker**.

## ## Use Cases

* **Analysts**: Query and export up‑to‑date portfolio slices (by asset class, industry, region) and view aggregates for reporting.
* **Data Teams**: Integrate a stable API contract into internal dashboards and scheduled workflows.
* **Engineers/AI**: Utilize clean schemas to power automated agentic workflows and deal-sourcing tools.

---

## ## Tech Stack & Architecture

* **Framework**: NestJS (Modular, Scalable TypeScript)
* **Database**: MongoDB (Flexible JSON-native storage)
* **API**: Swagger/OpenAPI for documentation and testing.
* **DevOps**: Docker + Docker Compose (With Watch mode).

---

## ## Data Model Overview

We utilize a **Single-Table Inheritance** approach to allow for future integration of other GPs (e.g., Blackstone, Carlyle) within the same collection.

| Field | Type | Description |
| --- | --- | --- |
| `source_gp` | String | Discriminator (e.g., "KKR") |
| `external_id` | String | Unique ID from source to prevent duplicates |
| `basics` | Object | HQ, Industry, Region, Description |
| `investment` | Object | Entry Year, Asset Class |
| `sync_metadata` | Object | `last_seen`, `is_active` (for exit detection) |

---

## ## Getting Started

1. Setup Environment
Clone the repository and create a .env file with your credentials:

Bash
MONGODB_URI=mongodb://localhost:27017/kkr-portfolio
PORT=3000
2. Quick Start (Automated)
Run the setup script to build containers, verify health, and trigger the initial data sync automatically:

Bash
chmod +x ./scripts/setup.sh
./scripts/setup.sh
Once complete, access the data immediately at: http://localhost:8080/api/portfolios

3. Manual Spin Up
If you prefer manual control:

Bash
docker-compose up --build
Navigate to http://localhost:3000/api/docs to manually trigger syncs via the /admin/sync/kkr endpoint.

## ## Project Status & Roadmap

### **PoC Task Tracker**

| Task | Category | Status | Notes |
| --- | --- | --- | --- |
| **NestJS Scaffold** | Infrastructure | ✅ Complete | Project initialized with TypeScript. |
| **MongoDB Connection** | Infrastructure | ✅ Complete | Mongoose integration active. |
| **Docker Compose** | Infrastructure | ✅ Complete | Includes NestJS (Watch Mode) + Mongo. |
| **KKR API Seeder** | Core Engine | ✅ Complete | Handles pagination & upsert logic. |
| **REST Endpoints** | API Access | ✅ Complete | List, Filter, and Detail views active. |
| **Base Schema** | Data Model | ✅ Complete | Basics + Investment fields implemented. |
| **Enrichment Fields** | Data Model | 🟦 To-Do | Stubbing schema for News/Social data. |
| **Bing/Apollo Adapters** | Enrichment | 🟦 To-Do | Scheduled for Phase 2. |
| **ChangeLog/History** | Tracking | 🟦 To-Do | Logic for tracking entry/exit dates. |
| **Slack Alerts** | DevOps | 🟦 To-Do | Notification for new PortCo detections. |

---

## ## Phase 2 Preview

Once the core pipeline is stabilized, we move from **Data Collection** to **Insight Generation**:

* **Playwright Scraper**: Target "Leadership" pages of PortCo sites.
* **Apollo.io Adapter**: Fetch employee headcount to identify high-growth assets.
* **Aggregated Analytics**: DB views for industry dominance and regional shifts.

## Phase 2: The "Depth" Phase (Current Focus)

* **Step 2.1:** The People Engine (P1)
Fetch the paginated JSON from the KKR People API.

Create a "Worker" to visit individual bio URLs using the first-lastname pattern.

Extract: Role, Team, Board Seats (mapped to PortCo names), and Bio text.

Goal: Cross-reference which KKR Executive "controls" which Portfolio Company.











Step 2.2: The News & Market Signal Wrapper (P2)
Integrate Bing News Search API filtered by "{PortCo Name} + KKR".

Extract: Article Title, URL, Publication Date, and a "Snippet."

Implement a basic Sentiment/Category tag (e.g., "Expansion", "Layoffs", "M&A").

Goal: Provide the "Why" behind the company's current status.

**optional add apoloo api at this stage**

Step 2.3: The SEC 8-K Parser (P3)
Scrape ir.kkr.com  for the latest filings.

Focus specifically on 8-K (Current Report) forms as they trigger for "Material Events" (Acquisitions, Dispositions, Departures).

Use an LLM (Qwen) to extract: "Event Type" and "Financial Impact Summary."

Goal: Formal regulatory verification of portfolio changes.

Phase 3: The "Active Intelligence" Phase (Future)
Step 3.1: Playwright Scrapers
Playwright scrapers for individual PortCo websites (Extracting product lists/client logos).

Step 3.2: Apollo/Proxycurl Integration
Integration of Apollo/Proxycurl for validated headcount and technographic data.

Step 3.3: The "Drift" Engine
"Drift" Engine: Logic to compare the original KKR thesis vs. current news/website data.