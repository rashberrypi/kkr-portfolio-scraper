# KKR Portfolio Intelligence Pipeline (PoC)
Once the core pipeline is stabilized, we move from **Data Collection** to **Insight Generation**:

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
    - portfolio

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
Navigate to http://localhost:3000/api/ to manually trigger syncs 

## ## Project Status & Roadmap

### **Phase 1 Task Sumary**

| Task | Category | Status | Notes |
| --- | --- | --- | --- |
| **NestJS Scaffold** | Infrastructure | ✅ Complete | Project initialized with TypeScript. |
| **MongoDB Connection** | Infrastructure | ✅ Complete | Mongoose integration active. |
| **Docker Compose** | Infrastructure | ✅ Complete | Includes NestJS (Watch Mode) + Mongo. |
| **KKR API Seeder** | Core Engine | ✅ Complete | Handles pagination & upsert logic. |
| **REST Endpoints** | API Access | ✅ Complete | List, Filter, and Detail views active. |
| **Base Schema** | Data Model | ✅ Complete | Basics + Investment fields implemented. |
---

### **Phase 2 Preview (depreceated)** 

* **Playwright Scraper**: Target "Leadership" pages of PortCo sites.
* **Apollo.io Adapter**: Fetch employee headcount to identify high-growth assets.
* **Aggregated Analytics**: DB views for industry dominance and regional shifts.

## Phase 2: The "data enrichment" Phase -

* **Step 2.1:** The People Engine (P1)
- Fetch the paginated JSON from the KKR People API. (done)
    - it uses a unique slug to indentify people - slug uitli = name+sourceGP.. will need more robust ids for scale (preferably a public unique id)
    - bio page will lead us to description.
    - these names wiht KKR tag can be used to fetch content from secform4.com to get personal investment details
    - tracxn has some enriching portco-peopel mapping data



## **Not Implemented ->**
- add a version control to log changes in data fiels (next)

Create a "Worker" to visit individual bio URLs using the first-lastname pattern.
Extract: Role, Team, 
Goal: Cross-reference which KKR Executive "controls" which Portfolio Company.

Step 2.2: The News & Market Signal Wrapper (P2)
Integrate Bing News Search API filtered by "{PortCo Name} + KKR".

Extract: Article Title, URL, Publication Date, and a "Snippet."

Implement a basic Sentiment/Category tag (e.g., "Expansion", "Layoffs", "M&A").

Goal: Provide the "Why" behind the company's current status.

**i can optional add apoloo api at this stage**

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