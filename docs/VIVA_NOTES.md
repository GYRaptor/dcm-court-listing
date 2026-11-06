# VIVA Preparation & Architecture Notes
## Differentiated Case Flow Management (DCFM) System
*Semester Major Project — Application Development (Ministry of Law and Justice Problem Statement 147)*

---

## 📅 Day 1: Setup, Architecture & Database Design

### 1. What Was Built
- **Project Scaffold**: Monorepo-style clean structure with isolated `server/` (Node.js/Express) and `client/` (React/Vite).
- **Git & Safety**: `.gitignore` configured to strictly prevent committing `.env` files, build directories, and `node_modules`. Standard `.env.example` templates created for both client and server.
- **Express Backend Core**: Modular Express app (`server/src/index.js`) equipped with CORS, JSON body parser, 404 handler, centralized error handling, and `/health` probe.
- **Vite React Frontend**: Modern React 18 client configured with Tailwind CSS for clean and accessible court portal styling.
- **Prisma Relational Schema**: 7 models (`User`, `Judge`, `Track`, `Case`, `Party`, `Hearing`, `AuditLog`) and 5 enums (`Role`, `CaseStatus`, `HearingOutcome`, `PartyRole`, `CaseType`) with custom relations and composite listing indexes (`@@index([status, priorityScore])`).
- **Human-in-the-Loop Track Classification**: `Case` model equipped with `suggestedTrackId`, current `trackId`, `trackApproved` boolean, `trackApprovedById`, and optional `trackOverrideReason`.
- **Audit Logging**: `AuditLog` table capturing immutable logs of case registrations, track approvals/overrides, cause-list generations, and hearing outcomes.
- **Database Migration & Seed**: Migration `20261106115054_init` applied to Neon PostgreSQL; seeded with 3 DCFM Tracks (FAST, STANDARD, COMPLEX), 1 Court Clerk, 3 Judges (Courtrooms 101, 102, 103 with capacities 10, 8, 12), and 1 Advocate/Lawyer, with secure bcrypt hashing for demo credentials (`Demo@1234`).

---

### 2. How It Works
- **Database Architecture**:
  - `User` table holds authentication details (`email`, `passwordHash`, `role`).
  - `Judge` has a 1-to-1 relation to `User` (via `userId`) storing courtroom metadata and daily listing capacity.
  - `Track` stores policy rules (`targetDays` and `gapDays`). It features dual back-relations (`cases` for active track and `suggestedCases` for recommended track).
  - `Case` maintains judicial progress: `status` (PENDING, LISTED, DISPOSED), `complexity`, `priorityScore`, `targetDisposalDate`, `earliestNextDate`, `adjournmentCount`, and track approval status (`trackApproved`).
  - `Party` links litigants and advocates to cases (1-to-many).
  - `Hearing` logs each court appearance, outcome, and judge remarks.
  - `AuditLog` records every administrative and judicial event with user reference, case reference, action name, and JSON metadata.
- **Health Verification**:
  - GET `/health` returns `{ status: "ok", message: "...", timestamp: "..." }`, enabling deployment health checks and frontend connectivity verification.

---

### 3. Key Decisions & Rationale
1. **ES Modules (`"type": "module"`)**: Used standard modern JavaScript `import`/`export` across the entire codebase instead of legacy CommonJS `require()`, maintaining clarity and consistency with React frontend code.
2. **String UUIDs vs Serial Integers for Primary Keys**: Primary keys use `String @id @default(uuid())` rather than auto-incrementing integers. This prevents enumeration attacks (where an attacker guesses `/cases/1`, `/cases/2`), improves security, and avoids sequence synchronization errors in distributed/cloud databases like Neon.
3. **Explicit Relation Names in Prisma**: Because `Case` references `Track` twice (`suggestedTrackId` and `trackId`), Prisma requires explicit relation names (`@relation("SuggestedTrack")` and `@relation("CurrentTrack")`) to disambiguate the foreign keys and map them cleanly to their corresponding back-relations on `Track`.
4. **Human-in-the-Loop Principle**: The software *only suggests* a track based on objective complexity scoring (case type, party count, expert evidence). A judicial officer (Judge) must approve or override it with a documented reason. Technology assists judicial discretion; it never replaces it.
5. **Database Index on `[status, priorityScore]`**: Daily cause-list generation frequently queries pending cases sorted by priority (`WHERE status = 'PENDING' ORDER BY priorityScore DESC`). A composite index on `(status, priorityScore)` makes this lookup $O(\log N)$ instead of requiring a full table scan ($O(N)$), preventing database bottlenecks as case volume grows.
6. **Connection Pooling with Neon (`-pooler`)**: Neon operates on serverless PostgreSQL compute instances. Using Neon's connection pooler endpoint with transaction/session pooling prevents exhausting PostgreSQL maximum client connection limits when Express serves concurrent requests.
7. **Idempotent Seeding with `upsert`**: `prisma/seed.js` uses `prisma.<model>.upsert()` matching on unique keys (`email`, `name`, `userId`). This guarantees that running `npm run prisma:seed` multiple times will update records safely without throwing unique constraint violations.

---

### 4. Likely Viva Questions & Answers

#### Q1: What is Differentiated Case Flow Management (DCFM) and why is it needed in Indian courts?
**Answer**: Traditional court listing schedules cases almost exclusively in First-In-First-Out (FIFO) chronological order, leading to bail applications and simple disputes getting stuck behind complex title suits. DCFM groups cases into tracks based on complexity (FAST: 90 days, STANDARD: 365 days, COMPLEX: 730 days). Simple matters move quickly through short adjournment gaps, and complex matters receive scheduled milestones, preventing the 2-year disposal limit from being breached.

#### Q2: Why does the Case model have two relations to Track (`suggestedTrack` and `track`)?
**Answer**: To preserve both the system's algorithmic suggestion and the current active track approved or overridden by the judge. This makes the system transparent and auditable: evaluators can see if a judge overrode a FAST track suggestion to COMPLEX, who did it, and the mandatory reason provided (`trackOverrideReason`).

#### Q3: How did you solve the dual relation ambiguity in Prisma ORM?
**Answer**: In Prisma, when two fields on a model point to the same target model, Prisma cannot infer which back-relation belongs to which foreign key. We resolved this by providing explicit relation names: `@relation("SuggestedTrack", ...)` on `suggestedTrackId` and `@relation("CurrentTrack", ...)` on `trackId`, mirrored by `suggestedCases` and `cases` on the `Track` model.

#### Q4: Why is there an `AuditLog` table and why is it important in court software?
**Answer**: Judicial accountability and compliance. Court proceedings must have a tamper-evident audit trail. Every time a case is registered, a track is approved or overridden, a cause list is generated, or a hearing outcome is recorded, an `AuditLog` row is created storing the `userId`, `action`, `caseId`, timestamp, and JSON metadata.

#### Q5: What is the purpose of `earliestNextDate` in the Case model?
**Answer**: `earliestNextDate` enforces statutory cooling-off periods (gap days) between hearings. When a case is adjourned or heard, its next hearing cannot be scheduled before `hearingDate + track.gapDays`. This ensures court registries do not prematurely relist matters before parties have completed legal discovery or notice service.
