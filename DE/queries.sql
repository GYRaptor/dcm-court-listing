-- ============================================================================
-- NyayaKram: 12 Mandatory SQL Queries (Executable Script)
-- System: District Court Case Flow Management System (Problem Statement #125)
-- Target DBMS: PostgreSQL 16 (Neon Serverless)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q1: INSERT Operation (New Urgent Bail Case Intake)
-- ----------------------------------------------------------------------------
INSERT INTO "cases" (
    "id", 
    "caseNumber", 
    "title", 
    "caseType", 
    "filingDate", 
    "hasExpertEvidence", 
    "isUrgent", 
    "complexity", 
    "suggestedTrackId", 
    "trackId", 
    "trackApproved", 
    "status", 
    "priorityScore", 
    "targetDisposalDate", 
    "earliestNextDate", 
    "adjournmentCount", 
    "judgeId", 
    "createdAt", 
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'DCM/2026/TEST-0999',
    'State vs. Test Litigant (Intake Demo)',
    'BAIL',
    CURRENT_DATE,
    false,
    true,
    1,
    (SELECT "id" FROM "tracks" WHERE "name" = 'FAST'),
    (SELECT "id" FROM "tracks" WHERE "name" = 'FAST'),
    false,
    'PENDING',
    30.0,
    CURRENT_DATE + INTERVAL '90 days',
    CURRENT_DATE + INTERVAL '7 days',
    0,
    (SELECT "id" FROM "judges" LIMIT 1),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
RETURNING "id", "caseNumber", "title", "caseType", "status", "priorityScore";

-- ----------------------------------------------------------------------------
-- Q2: UPDATE Operation (Judicial Track Override & Priority Adjustment)
-- ----------------------------------------------------------------------------
UPDATE "cases"
SET 
    "trackOverrideReason" = 'Judicial re-evaluation under administrative review',
    "priorityScore" = "priorityScore" + 5.0,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "caseNumber" = 'DCM/2026/0101'
RETURNING "caseNumber", "title", "trackOverrideReason", "priorityScore", "updatedAt";

-- ----------------------------------------------------------------------------
-- Q3: DELETE Operation (Purge Misfiled Draft Party)
-- ----------------------------------------------------------------------------
DELETE FROM "parties"
WHERE "name" = 'Draft Misfiled Litigant'
RETURNING "id", "caseId", "name", "role";

-- ----------------------------------------------------------------------------
-- Q4: SELECT with WHERE, AND, OR, ORDER BY (Active Cause List Filter)
-- ----------------------------------------------------------------------------
SELECT 
    c."caseNumber",
    c."title",
    c."caseType",
    t."name" AS "track",
    c."priorityScore",
    c."earliestNextDate",
    c."status",
    j."courtroom"
FROM "cases" c
INNER JOIN "tracks" t ON c."trackId" = t."id"
LEFT JOIN "judges" j ON c."judgeId" = j."id"
WHERE (c."status" = 'PENDING' OR c."status" = 'LISTED')
  AND (c."isUrgent" = true OR c."earliestNextDate" <= CURRENT_DATE + INTERVAL '7 days')
ORDER BY c."priorityScore" DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Q5: Aggregate Functions (Total, Average, Max, Sum Statistics)
-- ----------------------------------------------------------------------------
SELECT 
    COUNT(*)::INTEGER AS "totalCases",
    ROUND(AVG("complexity")::numeric, 2) AS "avgComplexity",
    MAX("complexity") AS "maxComplexity",
    ROUND(AVG("priorityScore")::numeric, 2) AS "avgPriorityScore",
    MAX("priorityScore") AS "highestPriorityScore",
    COUNT(*) FILTER (WHERE "isUrgent" = true)::INTEGER AS "urgentMattersCount",
    SUM("adjournmentCount")::INTEGER AS "cumulativeAdjournments"
FROM "cases";

-- ----------------------------------------------------------------------------
-- Q6: GROUP BY with HAVING (Bench Workload Balancing)
-- ----------------------------------------------------------------------------
SELECT 
    j."courtroom",
    u."name" AS "presidingJudge",
    j."dailyCapacity",
    COUNT(c."id")::INTEGER AS "assignedActiveCases",
    SUM(c."complexity")::INTEGER AS "cumulativeComplexityLoad",
    ROUND(AVG(c."priorityScore")::numeric, 1) AS "avgDocketPriority"
FROM "judges" j
INNER JOIN "users" u ON j."userId" = u."id"
LEFT JOIN "cases" c ON j."id" = c."judgeId" AND c."status" != 'DISPOSED'
GROUP BY j."id", j."courtroom", u."name", j."dailyCapacity"
HAVING SUM(c."complexity") > 30
ORDER BY "cumulativeComplexityLoad" DESC;

-- ----------------------------------------------------------------------------
-- Q7: Multi-Table JOIN (5 Tables: Cases, Tracks, Judges, Users, Parties)
-- ----------------------------------------------------------------------------
SELECT 
    c."caseNumber",
    c."title",
    t."name" AS "trackName",
    t."targetDays",
    j."courtroom",
    u."name" AS "judgeName",
    COUNT(p."id")::INTEGER AS "partyCount",
    c."status",
    c."priorityScore"
FROM "cases" c
INNER JOIN "tracks" t ON c."trackId" = t."id"
LEFT JOIN "judges" j ON c."judgeId" = j."id"
LEFT JOIN "users" u ON j."userId" = u."id"
LEFT JOIN "parties" p ON c."id" = p."caseId"
WHERE c."status" != 'DISPOSED'
GROUP BY c."id", c."caseNumber", c."title", t."name", t."targetDays", j."courtroom", u."name", c."status", c."priorityScore"
ORDER BY c."priorityScore" DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Q8: Correlated Subquery (Cases Exceeding Assigned Track Average Priority)
-- ----------------------------------------------------------------------------
SELECT 
    c."caseNumber",
    c."title",
    c."caseType",
    t."name" AS "track",
    c."priorityScore",
    ROUND((
        SELECT AVG(sub."priorityScore")
        FROM "cases" sub
        WHERE sub."trackId" = c."trackId"
          AND sub."status" != 'DISPOSED'
    )::numeric, 2) AS "trackAverageScore"
FROM "cases" c
INNER JOIN "tracks" t ON c."trackId" = t."id"
WHERE c."status" != 'DISPOSED'
  AND c."priorityScore" > (
      SELECT AVG(sub."priorityScore")
      FROM "cases" sub
      WHERE sub."trackId" = c."trackId"
        AND sub."status" != 'DISPOSED'
  )
ORDER BY c."priorityScore" DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- Q9: Window Functions (Intra-Track RANK and Docket DENSE_RANK)
-- ----------------------------------------------------------------------------
SELECT 
    c."caseNumber",
    t."name" AS "track",
    c."title",
    c."priorityScore",
    c."adjournmentCount",
    RANK() OVER (
        PARTITION BY c."trackId" 
        ORDER BY c."priorityScore" DESC
    )::INTEGER AS "trackRank",
    DENSE_RANK() OVER (
        ORDER BY c."priorityScore" DESC
    )::INTEGER AS "overallRank"
FROM "cases" c
INNER JOIN "tracks" t ON c."trackId" = t."id"
WHERE c."status" != 'DISPOSED'
ORDER BY t."name" ASC, "trackRank" ASC
LIMIT 15;

-- ----------------------------------------------------------------------------
-- Q10: Common Table Expression (CTE) - Track SLA Compliance Metrics
-- ----------------------------------------------------------------------------
WITH CaseAges AS (
    SELECT 
        c."id",
        c."trackId",
        c."status",
        (CURRENT_DATE - c."filingDate") AS age_days,
        c."targetDisposalDate",
        CASE 
            WHEN c."status" = 'DISPOSED' AND c."disposedDate" <= c."targetDisposalDate" THEN 1
            WHEN c."status" != 'DISPOSED' AND CURRENT_DATE <= c."targetDisposalDate" THEN 1
            ELSE 0
        END AS is_compliant,
        CASE 
            WHEN c."status" != 'DISPOSED' AND CURRENT_DATE > c."targetDisposalDate" THEN 1
            ELSE 0
        END AS is_overdue
    FROM "cases" c
)
SELECT 
    t."name" AS track_name,
    t."targetDays",
    COUNT(ca."id")::INTEGER AS total_cases,
    COUNT(ca."id") FILTER (WHERE ca."status" = 'DISPOSED')::INTEGER AS disposed_cases,
    SUM(ca.is_overdue)::INTEGER AS overdue_cases,
    ROUND((SUM(ca.is_compliant)::numeric / COUNT(ca."id")::numeric * 100), 1) AS "slaComplianceRatePct",
    ROUND(AVG(ca.age_days)::numeric, 1) AS avg_age_days
FROM "tracks" t
LEFT JOIN CaseAges ca ON t."id" = ca."trackId"
GROUP BY t."id", t."name", t."targetDays"
ORDER BY t."targetDays" ASC;

-- ----------------------------------------------------------------------------
-- Q11: Constraint Enforcement Testing
-- ----------------------------------------------------------------------------
-- Test 11A: Unique Constraint on tracks(name) -> Fails with SQLSTATE 23505
-- INSERT INTO "tracks" ("id", "name", "targetDays", "gapDays") VALUES (gen_random_uuid(), 'FAST', 90, 7);

-- Test 11B: Foreign Key on cases(trackId) -> Fails with SQLSTATE 23503
-- INSERT INTO "cases" ("id", "caseNumber", "title", "caseType", "suggestedTrackId", "trackId", "complexity", "targetDisposalDate", "earliestNextDate")
-- VALUES (gen_random_uuid(), 'DCM/9999/FAIL', 'Invalid FK Case', 'BAIL', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 1, CURRENT_DATE, CURRENT_DATE);

-- ----------------------------------------------------------------------------
-- Q12: Performance Verification with EXPLAIN ANALYZE
-- ----------------------------------------------------------------------------
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id", "caseNumber", "title", "priorityScore"
FROM "cases" c
WHERE "status" = 'PENDING'
ORDER BY "priorityScore" DESC
LIMIT 10;
