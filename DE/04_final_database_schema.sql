-- ============================================================================
-- Deliverable 4: Final Database Schema (DDL)
-- System: NyayaKram — District Court Case Flow Management System (DCFM)
-- Problem Statement: #125 — Differentiated Case Flow Management
-- Target DBMS: PostgreSQL 16 (Neon Serverless)
-- Generated: 2026-11-23
-- Description: Standalone, executable SQL DDL script to create all enums,
--              tables, primary keys, indexes, and referential constraints.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP EXISTING CONSTRAINTS & TABLES (Clean Rebuild Support)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "hearings" CASCADE;
DROP TABLE IF EXISTS "parties" CASCADE;
DROP TABLE IF EXISTS "cases" CASCADE;
DROP TABLE IF EXISTS "tracks" CASCADE;
DROP TABLE IF EXISTS "judges" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

DROP TYPE IF EXISTS "CaseType" CASCADE;
DROP TYPE IF EXISTS "PartyRole" CASCADE;
DROP TYPE IF EXISTS "HearingOutcome" CASCADE;
DROP TYPE IF EXISTS "CaseStatus" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- ----------------------------------------------------------------------------
-- 2. CREATE ENUMERATION TYPES
-- ----------------------------------------------------------------------------
CREATE TYPE "Role" AS ENUM (
    'CLERK', 
    'JUDGE', 
    'LAWYER'
);

CREATE TYPE "CaseStatus" AS ENUM (
    'PENDING', 
    'LISTED', 
    'DISPOSED'
);

CREATE TYPE "HearingOutcome" AS ENUM (
    'SCHEDULED', 
    'HEARD', 
    'ADJOURNED', 
    'DISPOSED'
);

CREATE TYPE "PartyRole" AS ENUM (
    'PETITIONER', 
    'RESPONDENT', 
    'ADVOCATE'
);

CREATE TYPE "CaseType" AS ENUM (
    'BAIL', 
    'CHEQUE_BOUNCE', 
    'RENT_DISPUTE', 
    'CIVIL_SUIT', 
    'COMMERCIAL_DISPUTE', 
    'PROPERTY_DISPUTE'
);

-- ----------------------------------------------------------------------------
-- 3. CREATE BASE ENTITY TABLES
-- ----------------------------------------------------------------------------

-- Table: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Table: judges
CREATE TABLE "judges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courtroom" TEXT NOT NULL,
    "dailyCapacity" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "judges_pkey" PRIMARY KEY ("id")
);

-- Table: tracks
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetDays" INTEGER NOT NULL,
    "gapDays" INTEGER NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- Table: cases
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseType" "CaseType" NOT NULL,
    "filingDate" DATE NOT NULL DEFAULT CURRENT_DATE,
    "hasExpertEvidence" BOOLEAN NOT NULL DEFAULT false,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "complexity" INTEGER NOT NULL,
    "suggestedTrackId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "trackApproved" BOOLEAN NOT NULL DEFAULT false,
    "trackApprovedById" TEXT,
    "trackOverrideReason" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'PENDING',
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDisposalDate" DATE NOT NULL,
    "earliestNextDate" DATE NOT NULL,
    "adjournmentCount" INTEGER NOT NULL DEFAULT 0,
    "disposedDate" DATE,
    "judgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- Table: parties
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PartyRole" NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- Table: hearings
CREATE TABLE "hearings" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "hearingDate" DATE NOT NULL,
    "outcome" "HearingOutcome" NOT NULL DEFAULT 'SCHEDULED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

-- Table: audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "caseId" TEXT,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- 4. CREATE UNIQUE CONSTRAINTS & PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- Unique index on users.email
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Unique index on judges.userId (enforces 1:1 user-judge relationship)
CREATE UNIQUE INDEX "judges_userId_key" ON "judges"("userId");

-- Unique index on tracks.name (FAST, STANDARD, COMPLEX)
CREATE UNIQUE INDEX "tracks_name_key" ON "tracks"("name");

-- Unique index on cases.caseNumber (Unique case registry docket identifier)
CREATE UNIQUE INDEX "cases_caseNumber_key" ON "cases"("caseNumber");

-- Composite index on cases (status, priorityScore) for sub-millisecond cause list queries
CREATE INDEX "cases_status_priorityScore_idx" ON "cases"("status", "priorityScore");

-- ----------------------------------------------------------------------------
-- 5. DEFINE FOREIGN KEY CONSTRAINTS WITH REFERENTIAL ACTIONS
-- ----------------------------------------------------------------------------

-- judges -> users (1:1 cascade)
ALTER TABLE "judges" 
    ADD CONSTRAINT "judges_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- cases -> tracks (suggested track)
ALTER TABLE "cases" 
    ADD CONSTRAINT "cases_suggestedTrackId_fkey" 
    FOREIGN KEY ("suggestedTrackId") REFERENCES "tracks"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- cases -> tracks (active assigned track)
ALTER TABLE "cases" 
    ADD CONSTRAINT "cases_trackId_fkey" 
    FOREIGN KEY ("trackId") REFERENCES "tracks"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- cases -> users (approving judge)
ALTER TABLE "cases" 
    ADD CONSTRAINT "cases_trackApprovedById_fkey" 
    FOREIGN KEY ("trackApprovedById") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- cases -> judges (presiding judge)
ALTER TABLE "cases" 
    ADD CONSTRAINT "cases_judgeId_fkey" 
    FOREIGN KEY ("judgeId") REFERENCES "judges"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- parties -> cases (1:N cascade)
ALTER TABLE "parties" 
    ADD CONSTRAINT "parties_caseId_fkey" 
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- hearings -> cases (1:N cascade)
ALTER TABLE "hearings" 
    ADD CONSTRAINT "hearings_caseId_fkey" 
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- hearings -> judges (1:N restrict)
ALTER TABLE "hearings" 
    ADD CONSTRAINT "hearings_judgeId_fkey" 
    FOREIGN KEY ("judgeId") REFERENCES "judges"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- audit_logs -> users (1:N cascade)
ALTER TABLE "audit_logs" 
    ADD CONSTRAINT "audit_logs_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- audit_logs -> cases (1:N set null)
ALTER TABLE "audit_logs" 
    ADD CONSTRAINT "audit_logs_caseId_fkey" 
    FOREIGN KEY ("caseId") REFERENCES "cases"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- END OF SCHEMA DDL
-- ============================================================================
