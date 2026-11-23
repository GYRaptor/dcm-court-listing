# Master Index & Architecture Overview: NyayaKram Data Engineering

**Course / Module**: Data Engineering (DE) Integrated Project Submission  
**Problem Statement**: #125 — Differentiated Case Flow Management System (DCFM)  
**Project Name**: NyayaKram (District Court Case Flow Management System)  
**Repository**: `GYRaptor/dcm-court-listing`  
**Database**: PostgreSQL 16 (Serverless on Neon)  
**ORM / Data Layer**: Prisma ORM with Connection Pooling & Transient Error Retry Wrapper  
**Application Stack**: Node.js, Express, React (Vite), Tailwind CSS  

---

## 1. Executive Summary & Problem Context

In Indian subordinate and district judiciary courts, case pendency and docket congestion represent acute administrative bottlenecks. Under conventional listing mechanisms, cases are often treated homogeneously on a First-In, First-Out (FIFO) basis, resulting in simple matters languishing alongside complex title suits, bail applications missing statutory urgency windows, and individual courtroom dockets exceeding presiding judges' daily hearing capacities.

**NyayaKram** implements **Differentiated Case Flow Management (DCFM)** (Problem Statement #125). Cases are systematically categorized at intake into specialized tracks based on substantive complexity and statutory urgency:
1. **FAST Track (Target: 90 Days, Cooling Gap: 7 Days)**: Summary trials, urgent bail applications, and negotiable instruments (cheque bounce) cases.
2. **STANDARD Track (Target: 365 Days, Cooling Gap: 21 Days)**: Standard civil suits, motor accident claims, and rent disputes.
3. **COMPLEX Track (Target: 730 Days, Cooling Gap: 45 Days)**: Multi-party partition suits, commercial contract disputes, and complex criminal trials involving voluminous expert testimony.

The system dynamically computes an objective, multi-factor **Priority Score** for every active case:
$$\text{Priority Score} = \left(\frac{\text{Age in Days}}{\text{Target Days}} \times 40\right) + (\text{Complexity} \times 3) + (\text{Adjournments} \times 8) + (\text{Urgency Factor})$$

This Data Engineering deliverable documents the relational database architecture, entity modeling, normalization derivation, executable schema, live sample records, 12 analytical SQL queries, and Node.js/Prisma backend integration that power NyayaKram.

---

## 2. Deliverables Directory Map (`DE/`)

The `DE/` directory contains complete documentation and code for the Data Engineering evaluation:

| Deliverable File | Title | Description |
| :--- | :--- | :--- |
| **`DE/README.md`** | Master Index & Architecture | High-level architectural overview, tech stack, directory index, connection pooling, RBAC, indexing, and scaling roadmap. |
| **`DE/01_database_selection_and_justification.md`** | Database Selection Rationale | Comparative technical analysis justifying PostgreSQL on Neon over MongoDB for judicial workflow management (ACID, relational integrity, concurrency). |
| **`DE/02_er_diagram_and_data_model.md`** | ER Diagram & Data Model | Complete Mermaid ER diagram (`erDiagram`), entity dictionary across all 7 tables, key definitions, constraints, enums, and relationship resolutions (1:1, 1:N). |
| **`DE/03_normalization.md`** | Normalization & Schema Design | Formal 1NF, 2NF, 3NF derivation, functional dependency matrix, and architectural rationale for controlled denormalization with transactional synchronization. |
| **`DE/04_final_database_schema.sql`** | Executable PostgreSQL DDL | Pure SQL script containing all `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX`, and `ALTER TABLE ... ADD CONSTRAINT` commands to build the database from scratch. |
| **`DE/05_sample_records.md`** | Live Sample Records | Real records (5–6 per table) queried directly from our live Neon PostgreSQL instance with redacted password hashes, presented in Markdown tables and JSON. |
| **`DE/06_queries_and_outputs.md`** | 12 SQL Queries & Execution Outputs | The 12 mandatory SQL queries (CRUD, Aggregates, Grouping, 5-table JOIN, Subqueries, Window Functions, CTEs, Constraints, EXPLAIN ANALYZE) with live terminal execution outputs. |
| **`DE/queries.sql`** | Executable SQL Query Script | Standalone, runnable `.sql` file containing all 12 analytical queries with parameters formatted for `psql` and pgAdmin execution. |
| **`DE/07_backend_integration.md`** | Backend Integration & ORM | Node.js/Express + Prisma integration snippets: connection pooling, atomic transactions (`$transaction`), cascade behavior, and JWT/RBAC middleware. |

---

## 3. Technology Stack & Environment

```
               +---------------------------------------------+
               |        React (Vite) + Tailwind CSS          |
               |        (Judicial Registry & Benches)        |
               +----------------------+----------------------+
                                      | HTTP / REST (JWT Auth)
                                      v
               +---------------------------------------------+
               |          Node.js / Express Backend          |
               |  (RBAC Middleware, Validation, Business API)|
               +----------------------+----------------------+
                                      | Prisma Client ORM
                                      | (Query Engine + Retry Wrapper)
                                      v
               +---------------------------------------------+
               |       Neon Serverless PgBouncer Pooler      |
               |   (Port 5432, connect_timeout=15, pooled)   |
               +----------------------+----------------------+
                                      | Pooled TCP Connections
                                      v
               +---------------------------------------------+
               |          PostgreSQL 16 Engine (Neon)        |
               |   Tables, Foreign Keys, Enums, B-Tree Index |
               +---------------------------------------------+
```

- **Database Engine**: PostgreSQL 16 on Neon Serverless Cloud.
- **Data Access Layer**: Prisma ORM `v5.22.0` with `@prisma/client`.
- **Application Server**: Node.js `v20.x` with Express.js.
- **Frontend Client**: React 18 with Vite, Tailwind CSS, Lucide icons, and Recharts.

---

## 4. Key Database Architecture Decisions

### 4.1 Serverless Connection Pooling & Scale-to-Zero Handling
- **The Challenge**: Neon Serverless PostgreSQL scales down compute instances to zero during inactivity. When an incoming request arrives, Neon wakes up within milliseconds; however, idle connections held by Node.js worker pools experience sudden TCP connection drops (`Error { kind: Closed, cause: None }` or Prisma error `P1017`).
- **The Architectural Solution**:
  1. **Dual URL Strategy**:
     - `DATABASE_URL`: Routes via Neon's connection pooler (`pgbouncer=true&connect_timeout=15&pool_timeout=15`) for application queries.
     - `DIRECT_URL`: Directly accesses compute nodes (`port 5432`) without pooling for schema migrations (`prisma migrate deploy`).
  2. **Automated Reconnection Wrapper**:
     In `server/src/utils/prisma.js`, Prisma client operations are wrapped in a resilient single-retry mechanism with exponential backoff (`300ms`). If a query encounters a dropped connection, the wrapper cleanly refreshes the pool connection and re-executes the operation transparently to the user.

### 4.2 Role-Based Access Control (RBAC) at the Data Boundary
Database operations are partitioned strictly across judicial roles via PostgreSQL enum `Role ('CLERK', 'JUDGE', 'LAWYER')` and Express authorization middleware:
- **`CLERK`**: Authorized for `cases` intake (`INSERT`), party registration (`INSERT`), and document tracking. Cannot approve track overrides or deliver judicial hearing outcomes.
- **`JUDGE`**: Authorized to modify track allocations (`trackApproved = true`, `trackOverrideReason`), assign courtroom daily capacities, and record binding hearing outcomes (`HEARD`, `ADJOURNED`, `DISPOSED`).
- **`LAWYER`**: Read-only visibility into public cause lists, case status progression, and assigned hearing dates.

### 4.3 Indexing Strategy for High-Throughput Cause List Generation
The court registry's primary operational workload is generating daily cause lists ordered by case urgency and priority score:
```sql
CREATE INDEX "cases_status_priorityScore_idx" ON "cases"("status", "priorityScore");
```
- **Why Composite?** The query predicate filters by `WHERE status = 'PENDING' OR status = 'LISTED'` and orders by `ORDER BY priorityScore DESC`.
- **Performance Impact**: Eliminates full-table sort overhead. As confirmed by `EXPLAIN ANALYZE` (Deliverable #6, Query 12), execution time is **0.078 ms** using a fast top-N heapsort over index-scanned rows.

### 4.4 Uncompromising Audit Logging
Every mutating judicial event (`CASE_REGISTERED`, `TRACK_CHANGED`, `HEARING_RESULT`, `STATUS_CHANGED`) triggers an immutable insert into the `audit_logs` table within the same database transaction. Foreign keys link each entry to the acting user (`userId`) and target case (`caseId`), ensuring complete traceability under the Indian Evidence Act.

---

## 5. Scaling & Enterprise Roadmap

1. **Read Replicas**: Provision read-only Neon compute endpoints for public cause-list lookups during peak morning registry hours (09:00–11:00 AM IST) to insulate courtroom bench updates from public query load.
2. **Table Partitioning**: Implement PostgreSQL declarative range partitioning on `cases` by `filingDate` (e.g., annual partitions: `cases_2025`, `cases_2026`) when total case volume exceeds 100,000 records.
3. **Automated Archival**: Implement pg_cron schedules to migrate records with `status = 'DISPOSED'` older than 3 years into cold storage / read-only archival tables, maintaining high buffer-cache hit ratios for active dockets.
