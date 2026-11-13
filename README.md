# Differentiated Case Flow Management (DCFM) System

> **Ministry of Law and Justice — Problem Statement #147**  
> An automated judicial case flow management and daily cause-list scheduling engine designed for Indian District Courts.

---

## Overview & Problem Statement (#147)

In traditional Indian district court registries, cases are predominantly listed on a First-In-First-Out (FIFO) basis by filing date. This practice creates severe systemic gridlock:
- **Procedural Obstruction**: High-turnaround matters (such as urgent bail petitions or Section 138 cheque bounce proceedings) get trapped behind voluminous, multi-party land title disputes.
- **Unpredictable Cause Lists**: Court dockets regularly exceed judicial daily hearing capacities, forcing repeated adjournments, wasting advocate preparation time, and inflating pendency.
- **Absence of Differentiated Disposal Benchmarks**: Matters lack statutory target timelines or mandatory cooling-off intervals between hearings.

The **DCFM Platform** operationalizes the Supreme Court of India's *Model Case Flow Management Rules* by categorizing cases into objective tracks (**FAST**, **STANDARD**, **COMPLEX**), enforcing statutory cooling periods, balancing judge workloads based on cumulative complexity, and generating capacity-capped, priority-sorted daily cause lists.

### Judicial Roles & Access Control
- **`CLERK` (Registry Officer)**: Intake and registration of cases, computation of initial complexity, litigant party entry, and institutional docket inspection.
- **`JUDGE` (Presiding Judicial Officer)**: Human-in-the-loop review (approve or override suggested track with mandatory justification), generation of daily courtroom cause lists, recording of proceeding decrees (`HEARD`, `ADJOURNED`, `DISPOSED`), and inspection of the immutable registry audit log.
- **`LAWYER` / Public Advocate**: Public docket lookup by institutional case number (`DCM/YYYY/XXXX`), real-time tracking of assigned tracks, next eligible hearing dates, and published proceedings history without access to administrative controls.

---

## Tech Stack & System Architecture

| Tier | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Client** | React 18, Vite, Tailwind CSS, Recharts | Responsive civic/legal-tech interface, data visualization, tabular data alignment, and accessible status indicators. |
| **Backend API** | Node.js (ES Modules), Express.js, Zod, bcrypt, jsonwebtoken | REST endpoints, JWT authentication, role-based access control (RBAC), and pure business logic services. |
| **ORM & Database** | Prisma ORM v6, PostgreSQL (Neon Serverless) | Type-safe queries, migration management, and strict calendar storage with native `@db.Date`. |
| **Deployment** | Vercel (Client) + Render (Server) | Zero-maintenance serverless web hosting with dynamic CORS handling and automated migration on deployment. |

### System Architecture Workflow

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Vercel)"]
        UI["React 18 SPA (Vite + Tailwind CSS)"]
        Recharts["Analytics & Visualizations (Recharts)"]
        State["Auth Context & RBAC Router"]
    end

    subgraph Server ["Application Server (Render)"]
        API["Express.js REST API (:5001)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        Services["Core Services (Scheduling, Complexity, Greedy Balancing)"]
        DatesEngine["dates.js (Pure IST Calendar Engine)"]
        PrismaEngine["Prisma ORM Client v6"]
    end

    subgraph Database ["Persistence Layer (Neon Serverless)"]
        Postgres[("PostgreSQL Database (@db.Date)")]
    end

    UI -->|HTTPS / REST API| API
    API --> AuthMiddleware
    AuthMiddleware --> Services
    Services --> DatesEngine
    Services --> PrismaEngine
    PrismaEngine -->|Pooled TCP / SSL| Postgres
```

---

## Database Design & DBMS Normalization (Academic Rubric)

### Entity-Relationship Diagram (ERD)

The relational schema matches `server/prisma/schema.prisma` field-for-field:

```mermaid
erDiagram
    User ||--o| Judge : "profiles"
    User ||--o{ AuditLog : "initiates"
    User ||--o{ Case : "approves"
    Judge ||--o{ Case : "assigned"
    Judge ||--o{ Hearing : "presides"
    Track ||--o{ Case : "suggested_for"
    Track ||--o{ Case : "active_track"
    Case ||--o{ Party : "involves"
    Case ||--o{ Hearing : "schedules"
    Case ||--o{ AuditLog : "records"

    User {
        String id PK
        String name
        String email UK
        String passwordHash
        Role role
        DateTime createdAt
    }

    Judge {
        String id PK
        String userId UK, FK
        String courtroom
        Int dailyCapacity
    }

    Track {
        String id PK
        String name UK
        Int targetDays
        Int gapDays
    }

    Case {
        String id PK
        String caseNumber UK
        String title
        CaseType caseType
        DateTime filingDate
        Boolean hasExpertEvidence
        Boolean isUrgent
        Int complexity
        String suggestedTrackId FK
        String trackId FK
        Boolean trackApproved
        String trackApprovedById FK
        String trackOverrideReason
        CaseStatus status
        Float priorityScore
        DateTime targetDisposalDate
        DateTime earliestNextDate
        Int adjournmentCount
        DateTime disposedDate
        String judgeId FK
        DateTime createdAt
        DateTime updatedAt
    }

    Party {
        String id PK
        String caseId FK
        String name
        PartyRole role
    }

    Hearing {
        String id PK
        String caseId FK
        String judgeId FK
        DateTime hearingDate
        HearingOutcome outcome
        String remarks
        DateTime createdAt
        DateTime updatedAt
    }

    AuditLog {
        String id PK
        String userId FK
        String action
        String caseId FK
        String details
        DateTime createdAt
    }
```

---

### DBMS Normalization Proof

#### 1. First Normal Form (1NF) Compliance
- **Atomic Attributes**: All table columns hold strictly atomic, scalar values (e.g., `filingDate`, `complexity`, `courtroom`).
- **Elimination of Repeating Groups**: Traditional systems often store litigants or hearing dates as comma-separated text strings or raw JSON arrays within the case record. In our schema:
  - Multiple litigants are decomposed into independent rows in the `Party` table (`role: PETITIONER | RESPONDENT | ADVOCATE`), referencing `caseId`.
  - Multiple hearings and past proceedings are decomposed into discrete rows in the `Hearing` table, maintaining strict relational integrity.

#### 2. Second Normal Form (2NF) Compliance
- **Full Functional Dependency**: Every entity utilizes a single-attribute synthetic primary key (`id` generated via UUIDv4).
- **No Partial Dependencies**: Because composite primary keys are avoided, every non-key column is functionally dependent on the entire primary key, eliminating partial key dependency vulnerabilities.

#### 3. Third Normal Form (3NF) Compliance
- **Elimination of Transitive Dependencies**: Non-prime attributes depend solely on the primary key, never transitively through other non-prime attributes:
  - `targetDays` and `gapDays` are determined exclusively by the track classification. Instead of repeating `targetDays` and `gapDays` on every `Case` row (which would create update anomalies if track statutory rules change), they reside exclusively in the `Track` entity (`trackId` $\rightarrow$ `Track`).
  - Judicial metadata (`courtroom`, `dailyCapacity`) is isolated within the `Judge` table rather than duplicated across `User` or `Case` records.
  - If a judge changes courtroom, only a single record in `judges` updates, avoiding systemic update and deletion anomalies.

#### 4. Controlled Denormalization (Engineering Rationale)
In standard 3NF, `priorityScore` and `adjournmentCount` could theoretically be computed dynamically on every read request by aggregating all historical `Hearing` records (`COUNT(outcome = 'ADJOURNED')`) and re-calculating elapsed days.

**Why Controlled Denormalization Was Applied**:
- During morning courtroom listing hours, the cause-list scheduling engine must sort and rank thousands of active cases in real time. Dynamic aggregation would demand expensive table-scan joins across hundreds of thousands of historical hearing rows:
  $$\mathcal{O}(N \times M \log N)$$
- We persist `priorityScore` (`Float`) and `adjournmentCount` (`Int`) directly on the `Case` entity and establish a composite database index:
  ```prisma
  @@index([status, priorityScore])
  ```
- **Trade-Off Guarantee**: This reduces cause-list generation and registry dashboard queries to an index-driven retrieval running in $\mathcal{O}(K \log K)$ where $K$ is the courtroom daily capacity limit, while transactional integrity is strictly preserved through Prisma `$transaction` updates upon each recorded hearing decree.

---

## Core Judicial Algorithms

### 1. Differentiated Tracks & Statutory Cooling Gaps
Every case is mapped to a statutory track with an enforceable cooling gap between consecutive hearings:

| Track | Target Disposal | Mandatory Cooling Gap | Typical Matters |
| :--- | :--- | :--- | :--- |
| **FAST** | **90 calendar days** | **7 days** minimum gap | Bail petitions, Section 138 NI Act (cheque bounce), summary rent disputes |
| **STANDARD** | **365 calendar days** (1 year) | **21 days** minimum gap | Standard civil suits, contract breaches, contested rent matters |
| **COMPLEX** | **730 calendar days** (2 years max) | **45 days** minimum gap | Commercial disputes, land title partition suits, multi-expert actions |

### 2. Algorithmic Complexity Scoring
Track classification begins with an objective algorithmic complexity computation:

$$\text{Complexity Score} = \text{Base Points} + \text{Party Penalty} + \text{Evidence Penalty}$$

- **Base Points by Matter Type**:
  - `BAIL`: 1 point
  - `CHEQUE_BOUNCE`: 2 points
  - `RENT_DISPUTE`: 3 points
  - `CIVIL_SUIT`: 5 points
  - `COMMERCIAL_DISPUTE`: 6 points
  - `PROPERTY_DISPUTE`: 7 points
- **Party Multiplier**: $+1$ point if total parties (petitioners + respondents) $> 2$.
- **Expert Evidence Flag**: $+2$ points if `hasExpertEvidence` is true (forensics, handwriting, valuation, medical testimony).

**Threshold Mapping**:
- Score $1 \le S \le 3 \implies$ **FAST** Track
- Score $4 \le S \le 6 \implies$ **STANDARD** Track
- Score $S \ge 7 \implies$ **COMPLEX** Track

### 3. Priority Scoring Formula
Cause list generation ranks eligible matters in descending order of urgency:

$$\text{Priority Score} = \left(\frac{\text{Age in Days}}{\text{Track Target Days}} \times 100\right) + (\text{isUrgent} \ ? \ 30 : 0) + \min(5 \times \text{Adjournment Count}, 25)$$

1. **Normalized Target Consumption**: $\left(\frac{\text{Age in Days}}{\text{Target Days}} \times 100\right)$ standardizes urgency across tracks. A 60-day-old FAST case (target 90d) has consumed **66.7%** of its lifespan, whereas a 60-day-old COMPLEX case (target 730d) has consumed only **8.2%**. The FAST matter rightfully receives listing precedence.
2. **Urgency Bump**: $+30$ points for urgent interim applications.
3. **Adjournment Escalation with Ceiling**: $+5$ points per past adjournment to prevent chronic postponement, capped strictly at $25$ points (`Math.min(5 * adjournmentCount, 25)`) so older stagnant cases cannot monopolize the docket.
4. **Precision**: Stored as `Float` and rounded to 1 decimal place.

### 4. Idempotent Cause-List Generation Algorithm
The scheduling engine (`server/src/services/causelist.service.js`) executes in five deterministic stages:

```
[Request: judgeId, listingDate]
               │
               ▼
   Check Existing Hearings?
     ├── YES ──> Return Existing Docket (Idempotent)
     └── NO
          │
          ▼
   Fetch Eligible PENDING Cases:
     - judgeId == target judge
     - earliestNextDate <= listingDate (Cooling Gap Enforced)
          │
          ▼
   Recalculate Dynamic Priority Scores as of listingDate
          │
          ▼
   Sort Descending by Priority Score
          │
          ▼
   Slice by judge.dailyCapacity
          │
          ▼
   Prisma $transaction (Atomic):
     1. Create SCHEDULED Hearing records
     2. Update Case status: PENDING -> LISTED
     3. Write CAUSE_LIST_GENERATED Audit Log
```

- **Idempotence**: Re-triggering the cause list for the same judge and date returns the already-generated docket without duplicate hearing rows or orphaned case transitions.
- **Cooling Gap Enforcement**: `earliestNextDate` is set to `addDays(hearingDate, track.gapDays)` whenever an outcome (`ADJOURNED` or `HEARD`) is recorded, mathematically preventing premature relisting.

### 5. Greedy Judicial Workload Balancing
To prevent litigation bottlenecks where one courtroom is burdened with high-complexity trials while another handles light summary disputes, new cases are assigned using a greedy minimization heuristic:

$$\text{Workload}(J) = \sum_{c \in \text{Cases}(J), \ \text{status} \in \{\text{PENDING}, \ \text{LISTED}\}} \text{complexity}(c)$$

The system assigns each newly registered matter to $\min(\text{Workload}(J))$. When a case is marked `DISPOSED`, its complexity score is removed from the judge's active tally, maintaining balance automatically.

---

## Seeded Demo Accounts & Credentials

All demo accounts share the uniform evaluation password: `Demo@1234`

| Role | Email | Courtroom / Assignment | Description |
| :--- | :--- | :--- | :--- |
| **Court Clerk** | `clerk@court.gov.in` | Central Filing Registry | Registers new matters, computes complexity, inspects caseload KPIs |
| **Judge 1** | `saxena@court.gov.in` | Courtroom 101 (Capacity: 10) | Presiding judge; track approvals/overrides, cause-list generation, bench hearings |
| **Judge 2** | `kumar@court.gov.in` | Courtroom 102 (Capacity: 8) | Bench hearing decrees, cause lists, outcome recordings |
| **Lawyer / Public** | `rohit.lawyer@court.gov.in` | Bar Council of Delhi | Public case docket lookup (`DCM/2026/0001`), hearing timeline inspection |

*(Note: Quick-fill buttons on the login screen automatically populate these credentials for rapid evaluation).*

---

## Local Setup & Development Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: Cloud instance (e.g., [Neon](https://neon.tech)) or local PostgreSQL database

### 1. Clone the Repository
```bash
git clone https://github.com/GYRaptor/dcm-court-listing.git
cd dcm-court-listing
```

### 2. Environment Configuration

**Server Environment (`server/.env`):**
```bash
cp server/.env.example server/.env
```
Ensure `server/.env` contains your PostgreSQL connection string:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
JWT_SECRET="your-256-bit-jwt-secret-key-here"
CLIENT_URL="http://localhost:5173"
```

**Client Environment (`client/.env`):**
```bash
cp client/.env.example client/.env
```
Ensure `client/.env` contains:
```env
VITE_API_URL="http://localhost:5001"
```

### 3. Install Dependencies & Run Database Seed
```bash
# 1. Setup Backend
cd server
npm install
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js

# 2. Setup Frontend
cd ../client
npm install
```
*(The seed script populates 16 realistic court cases across all three tracks, with active litigants, prior hearings, overdue flags, and audit records).*

### 4. Start Local Development Servers
```bash
# Terminal 1: Backend API Service (Runs on http://localhost:5001)
cd server
npm run dev

# Terminal 2: Frontend Web Application (Runs on http://localhost:5173)
cd client
npm run dev
```

Navigate to `http://localhost:5173` in your browser. Verify the system online badge, inspect analytics on the Dashboard, review cases in the Master Registry, or test public search on the Case Lookup page.

---

## Production Deployment Reference (Vercel & Render)

### Backend Service (Render)
- **Runtime**: Node.js Web Service
- **Root Directory**: `server`
- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm start` *(executes `npx prisma migrate deploy && node src/index.js`)*
- **Environment Variables**:
  - `DATABASE_URL`: Connection string from Neon PostgreSQL
  - `JWT_SECRET`: Secure 256-bit secret key
  - `CLIENT_URL`: `https://<your-vercel-app>.vercel.app`
  - `NODE_ENV`: `production`

### Frontend Client (Vercel)
- **Framework Preset**: `Vite`
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://<your-render-service>.onrender.com`
- **SPA Routing**: `client/vercel.json` provides rewrite rule `{"source": "/(.*)", "destination": "/index.html"}` to ensure direct route refreshes do not return 404.

---

## Project Repository Layout

```text
dcm-court-listing/
├── client/                     # Frontend Application (Vite + React)
│   ├── public/                 # Static branding assets
│   ├── src/
│   │   ├── components/         # Navbar, StatusBadge, SkeletonLoader, EmptyState, DashboardMetrics
│   │   ├── context/            # AuthContext (JWT management & session state)
│   │   ├── pages/              # Dashboard, Cases, CaseDetail, CauseList, MyHearings, AuditLog, Lookup, Login
│   │   ├── api.js              # Centralized fetch wrapper
│   │   ├── App.jsx             # Route definitions & layout container
│   │   └── main.jsx            # React root mount
│   ├── .env.example            # Client env documentation
│   ├── vercel.json             # Vercel SPA rewrite configuration
│   └── vite.config.js          # Vite build config
│
├── server/                     # Backend API Service (Node + Express)
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma schema with @db.Date & indexes
│   │   ├── seed.js             # Idempotent seed script (16 court cases)
│   │   └── migrations/         # PostgreSQL migration history
│   ├── src/
│   │   ├── routes/             # REST routing (auth, cases, causelist, hearings, audit)
│   │   ├── services/           # Business logic (scheduling, complexity, priority, judge assignment)
│   │   ├── utils/              # dates.js (pure IST calendar arithmetic)
│   │   └── index.js            # Express app bootstrap, CORS & health checks
│   ├── .env.example            # Server env documentation
│   └── package.json            # Node manifest with production migrate start script
│
├── docs/                       # Technical & Academic Documentation
│   ├── DESIGN_DECISIONS.md     # Architectural records & design rationale
│   └── VIVA_NOTES.md           # Comprehensive examination defense guide
└── README.md                   # Master institutional documentation
```

---

## Academic & Institutional Disclosure
Built in compliance with the procedural guidelines of the **Ministry of Law and Justice (Problem Statement #147)**. The system prioritizes human-in-the-loop judicial oversight, institutional auditability, and algorithmic fairness to support the Indian District Judiciary in reducing systemic pendency.
