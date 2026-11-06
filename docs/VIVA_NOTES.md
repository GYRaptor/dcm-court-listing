# VIVA Preparation & Architecture Notes
## Differentiated Case Flow Management (DCM) System
*Semester Major Project — Application Development*

---

## 📅 Day 1: Setup, Architecture & Database Design

### 1. What Was Built
- **Project Scaffold**: Monorepo-style clean structure with isolated `server/` (Node.js/Express) and `client/` (React/Vite).
- **Git & Safety**: `.gitignore` configured to strictly prevent committing `.env` files, build directories, and `node_modules`. Standard `.env.example` templates created for both client and server.
- **Express Backend Core**: Modular Express app (`server/src/index.js`) equipped with CORS, JSON body parser, 404 handler, centralized error handling, and `/health` probe.
- **Vite React Frontend**: Modern React 18 client configured with Tailwind CSS for clean and accessible court portal styling.
- **Prisma Relational Schema**: 6 models (`User`, `Judge`, `Track`, `Case`, `Party`, `Hearing`) and 5 enums (`Role`, `CaseStatus`, `HearingOutcome`, `PartyRole`, `CaseType`) with custom relations and composite listing indexes (`@@index([status, priorityScore])`).
- **Seed Script (`prisma/seed.js`)**: Idempotent seeding script for 3 DCM Tracks (FAST, STANDARD, COMPLEX), 1 Court Clerk, 3 Judges (Courtrooms 101, 102, 103 with capacities 10, 8, 12), and 1 Advocate/Lawyer, with secure bcrypt hashing for demo credentials (`Demo@1234`).

---

### 2. How It Works
- **Database Architecture**:
  - `User` table holds authentication details (`email`, `passwordHash`, `role`).
  - `Judge` has a 1-to-1 relation to `User` (via `userId`) storing courtroom metadata and daily listing capacity.
  - `Track` stores policy rules (`targetDays` and `gapDays`). Cases reference a `trackId`.
  - `Case` maintains judicial progress: `status` (PENDING, LISTED, DISPOSED), `complexity`, `priorityScore`, `targetDisposalDate`, `earliestNextDate`, and `adjournmentCount`.
  - `Party` links litigants and advocates to cases (1-to-many).
  - `Hearing` logs each court appearance, outcome, and judge remarks.
- **Health Verification**:
  - GET `/health` returns `{ status: "ok", message: "...", timestamp: "..." }`, enabling deployment health checks and frontend connectivity verification.

---

### 3. Key Decisions & Rationale
1. **ES Modules (`"type": "module"`)**: Used standard modern JavaScript `import`/`export` across the entire codebase instead of legacy CommonJS `require()`, maintaining clarity and consistency with React frontend code.
2. **String UUIDs vs Serial Integers for Primary Keys**: Primary keys use `String @id @default(uuid())` rather than auto-incrementing integers. This prevents enumeration attacks (where an attacker guesses `/cases/1`, `/cases/2`), improves security, and avoids sequence synchronization errors in distributed/cloud databases like Neon.
3. **Database Index on `[status, priorityScore]`**: Daily cause-list generation frequently queries pending cases sorted by priority (`WHERE status = 'PENDING' ORDER BY priorityScore DESC`). A composite index on `(status, priorityScore)` makes this lookup $O(\log N)$ instead of requiring a full table scan ($O(N)$), preventing database bottlenecks as case volume grows.
4. **Idempotent Seeding with `upsert`**: `prisma/seed.js` uses `prisma.<model>.upsert()` matching on unique keys (`email`, `name`, `userId`). This guarantees that running `npm run prisma:seed` multiple times will update records safely without throwing unique constraint violations.

---

### 4. Likely Viva Questions & Answers

#### Q1: What is Differentiated Case Flow Management (DCM) and why is it needed in Indian courts?
**Answer**: Traditional court listing schedules cases almost exclusively in First-In-First-Out (FIFO) chronological order, leading to bail applications and simple disputes getting stuck behind complex title suits. DCM groups cases into tracks based on complexity (FAST: 90 days, STANDARD: 365 days, COMPLEX: 730 days). Simple matters move quickly through short adjournment gaps, and complex matters receive scheduled milestones, preventing the 2-year disposal limit from being breached.

#### Q2: Why did you choose Prisma ORM with PostgreSQL instead of MongoDB/Mongoose?
**Answer**: Court case management is intrinsically relational. Cases have strict relations to judges, multiple parties (petitioners, respondents), and an audit trail of hearings and outcomes. Relational integrity with foreign keys (and cascade deletes where appropriate, such as parties deleting with a case) prevents orphaned records. Furthermore, cause list generation and outcome recording require ACID transactions across multiple tables (`prisma.$transaction`), which PostgreSQL excels at.

#### Q3: Why is there a separate `Judge` table instead of storing `courtroom` and `dailyCapacity` directly on the `User` table?
**Answer**: Separation of concerns and normalization. Only users with the role `JUDGE` possess judicial attributes like courtroom assignment and daily hearing capacity; court clerks and advocates do not. A 1-to-1 relation (`User.judge`) avoids nullable columns cluttering the `users` table and makes role-specific extensions clean and type-safe.

#### Q4: Why did you use `bcrypt` for password hashing and why are we storing `passwordHash` rather than plaintext?
**Answer**: In accordance with modern security standards, plaintext passwords must never be stored in the database. `bcrypt` incorporates a cryptographic salt and an adaptive work factor (cost 10) to protect against rainbow table attacks and brute force cracking. When authenticating, `bcrypt.compare()` compares the supplied password against the salted hash in constant time to thwart timing attacks.

#### Q5: What is the purpose of `earliestNextDate` in the Case model?
**Answer**: `earliestNextDate` enforces statutory or procedural cooling-off periods (gap days) between hearings. When a case is adjourned or heard, its next hearing cannot be scheduled before `hearingDate + track.gapDays`. This ensures court registries do not prematurely relist matters before parties have completed legal discovery or notice service.

