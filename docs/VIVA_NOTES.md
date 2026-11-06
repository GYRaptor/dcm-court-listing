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


---

## 📅 Day 2: Authentication, Authorization & Role-Based Access Control (RBAC)

### 1. What Was Built
- **Zod Validation Schemas (`server/src/schemas/auth.schema.js`)**: Strict validation rules for advocate registration (name min 2, valid email, password min 8) and user login.
- **RBAC Middleware (`server/src/middleware/auth.middleware.js`)**:
  - `requireAuth`: Validates `Authorization: Bearer <token>`, verifies signature via `jwt.verify`, and attaches authenticated user entity (`req.user`) without `passwordHash`.
  - `requireRole(...allowedRoles)`: Higher-order guard returning `403 Forbidden` if `req.user.role` does not match authorized roles.
- **Authentication Endpoints (`server/src/routes/auth.routes.js`)**:
  - `POST /auth/register`: Public self-registration strictly hardcoded to the `LAWYER` role (ignoring any requested role).
  - `POST /auth/login`: Issues 7-day signed JWT on matching credentials with uniform error messaging.
  - `GET /auth/me`: Returns current user profile with courtroom attributes for judges.
  - Demo RBAC test endpoints: `GET /auth/clerk-only` and `GET /auth/judge-only`.
- **Client Fetch Wrapper (`client/src/api.js`)**: Single clean fetch abstraction that injects Bearer JWT from `localStorage` and throws standard errors.
- **Session Management (`client/src/context/AuthContext.jsx`)**: Global React state maintaining user session, rehydrating on page refresh via `GET /auth/me`.
- **Protected Routing (`client/src/components/ProtectedRoute.jsx`)**: React Router route guard redirecting unauthenticated traffic to `/login` and displaying an "Access Not Allowed" screen for role violations.
- **Role-Aware UI (`client/src/components/Navbar.jsx`)**: Dynamic navigation rendering role-specific menus (Clerk, Judge, Lawyer), user profile tags, and logout action.
- **Auth Pages (`client/src/pages/Login.jsx`, `Register.jsx`)**: Tailwind-styled login with viva demo quick-fill accounts and advocate enrollment forms.
- **Automated Test Suite (`server/tests/auth.test.js`)**: 12 comprehensive automated assertions proving all Day 2 security criteria.

---

### 2. How It Works & Core Concepts

#### A. How Bcrypt Hashing Works
- Passwords are never stored in plaintext. `bcrypt.hash(password, 10)` generates a random 128-bit salt and combines it with an adaptive key derivation function (10 rounds = $2^{10} = 1024$ iterations).
- The output string contains the algorithm version, cost factor, salt, and hash. When validating, `bcrypt.compare(password, hash)` extracts the salt from the stored hash, hashes the candidate password using that same salt, and performs a **constant-time byte comparison** to prevent timing attacks.

#### B. What a JWT Contains & Why It Is Signed
- A JSON Web Token consists of three base64url-encoded parts separated by dots:
  1. **Header**: Token type (`JWT`) and hashing algorithm (`HS256`).
  2. **Payload**: Non-sensitive claims identifying the user (`{ id: user.id, role: user.role, iat, exp }`).
  3. **Signature**: `HMACSHA256(base64Url(header) + "." + base64Url(payload), secret)`.
- **Why it is signed**: The signature guarantees **integrity**. If a malicious client modifies their role in the payload from `LAWYER` to `JUDGE`, the server's signature check will fail because the attacker does not possess the server's private `JWT_SECRET`.

#### C. How `requireAuth` & `requireRole` Work
- `requireAuth` inspects the HTTP `Authorization` header. If missing or invalid, it returns `401 Unauthorized`. It verifies the JWT signature, looks up the active user record in Neon, and attaches it to `req.user`.
- `requireRole(...roles)` executes immediately after `requireAuth`. It checks if `roles.includes(req.user.role)`. If true, execution proceeds to the controller via `next()`; if false, it immediately halts the request with `403 Forbidden`.

#### D. Why Registration Is LAWYER-Only
- In a court system, Court Clerks and Judicial Officers are appointed through official administrative procedures; allowing public self-registration for judicial roles would represent a catastrophic security failure. Self-registration is strictly for practicing advocates (`LAWYER`), while `CLERK` and `JUDGE` accounts are provisioned exclusively through administrative seeds.

#### E. Why Login Returns the Same Error for Both Failures
- `POST /auth/login` returns `{ error: "Invalid email or password" }` with status `401` regardless of whether the email does not exist or the password was incorrect. If the server returned "User not found", an attacker could brute-force email lists to enumerate valid court staff and judge accounts.

---

### 3. Key Decisions & Rationale
1. **Stateless JWTs vs State-Backed Sessions**: JWTs eliminate the need to query a Redis or database session store on every HTTP request. The token itself securely carries the user's ID and role verified by HMAC signature.
2. **Server-Enforced Role Assignment**: The registration controller explicitly destructures only `{ name, email, password }` and forces `role: "LAWYER"`. Any client payload containing `{ role: "JUDGE" }` is ignored, defeating privilege escalation attempts.
3. **Session Rehydration with `/auth/me`**: Rather than trusting obsolete user data cached in `localStorage`, the client queries `GET /auth/me` upon page refresh. If an account has been disabled or their courtroom assignment changed, it immediately reflects on the frontend.
4. **Defense in Depth with `select` Exclusion**: All Prisma queries in auth routes explicitly `select` safe fields or exclude `passwordHash`, guaranteeing that database password hashes are never leaked over the wire.

---

### 4. Likely Viva Questions & Answers

#### Q1: What is the difference between Authentication and Authorization in your DCFM system?
**Answer**: Authentication is verifying **identity** ("Who are you?"), handled by `POST /auth/login` verifying email and password and issuing a signed JWT. Authorization is verifying **permissions** ("What are you allowed to do?"), handled by the `requireRole` middleware and `ProtectedRoute` component ensuring a Lawyer cannot generate cause lists or a Clerk cannot record judicial hearing outcomes.

#### Q2: Why did you use JWTs instead of traditional cookie-based sessions stored in a database?
**Answer**: JWTs are stateless and horizontally scalable. Because the user's ID and role are cryptographically signed inside the token, the backend does not need to maintain a shared session table or Redis cache. This fits serverless deployments (such as Render and Neon) where requests may hit distributed container instances.

#### Q3: How does `bcrypt.compare` prevent timing attacks?
**Answer**: In a naive string comparison (`a === b`), the comparison terminates at the first differing character, allowing an attacker to deduce characters based on microscopic differences in server response time. `bcrypt.compare` uses a constant-time comparison algorithm that always inspects all bytes regardless of where differences occur, eliminating timing side channels.

#### Q4: If the JWT payload is readable by anyone (base64 encoded), what prevents a user from tampering with their role?
**Answer**: While the payload can be decoded by anyone, it is cryptographically signed using `HMAC-SHA256` with our secret key (`JWT_SECRET`). If an attacker alters the payload (e.g., changing `"role": "LAWYER"` to `"role": "JUDGE"`), the signature no longer matches the payload. When `jwt.verify()` runs on the server, it detects the mismatch and throws a `JsonWebTokenError`, rejecting the request with 401.

#### Q5: Why is `passwordHash` stripped before returning user objects to the client?
**Answer**: Principle of Least Privilege and Information Exposure prevention. Even though bcrypt hashes are salted and one-way, exposing them in HTTP responses allows offline dictionary attacks or rainbow table probing if traffic is intercepted or client logs are exposed.
