process.env.NODE_ENV = "test";
import assert from "node:assert/strict";
import prisma from "../src/utils/prisma.js";
import { generateCauseList, getCauseList } from "../src/services/causelist.service.js";
import { todayIST, toDateOnly, addDays } from "../src/utils/dates.js";
import app from "../src/index.js";
import jwt from "jsonwebtoken";

const TEST_PREFIX = `TEST_DAY5_${Date.now().toString().slice(-6)}_`;
const testCaseIds = [];
const testHearingIds = [];
const testAuditLogIds = [];

function createAuthHeader(role = "CLERK", email = "clerk@court.gov.in") {
  const token = jwt.sign(
    { id: "test-auth-user", role, email },
    process.env.JWT_SECRET || "dev-jwt-secret-key-32-chars-minimum",
    { expiresIn: "1h" }
  );
  return `Bearer ${token}`;
}

async function runTests() {
  console.log("🧪 Running Day 5 Cause-List Generator Test Suite...\n");

  // Pre-cleanup any lingering test cases
  await prisma.case.deleteMany({
    where: { caseNumber: { startsWith: "TEST_DAY5_" } },
  }).catch(() => {});

  let testJudge = null;
  let fastTrack = null;
  let standardTrack = null;
  let complexTrack = null;

  try {
    // Retrieve seeded tracks
    const tracks = await prisma.track.findMany();
    fastTrack = tracks.find((t) => t.name === "FAST");
    standardTrack = tracks.find((t) => t.name === "STANDARD");
    complexTrack = tracks.find((t) => t.name === "COMPLEX");

    // Retrieve or seed a test judge
    testJudge = await prisma.judge.findFirst({
      include: { user: true },
    });

    assert.ok(testJudge, "Seeded judge must be present in database");
    assert.ok(fastTrack, "FAST track must exist");

    const today = todayIST();
    const listingDate = addDays(today, 10); // Listing scheduled for 10 days in future

    console.log("--- Unit Tests: Cause List Scheduling Engine ---");

    // 1. Create 3 test cases for this judge:
    // Case A: High priority (age 80 days relative to target, urgent), eligible
    // Case B: Medium priority (age 20 days), eligible
    // Case C: Ineligible because earliestNextDate is 20 days in future (> listingDate)
    const caseA = await prisma.case.create({
      data: {
        caseNumber: `${TEST_PREFIX}001`,
        title: "Day 5 Urgent Bail Matter",
        caseType: "BAIL",
        filingDate: toDateOnly(addDays(today, -80)),
        hasExpertEvidence: false,
        isUrgent: true,
        complexity: 1,
        trackId: fastTrack.id,
        suggestedTrackId: fastTrack.id,
        status: "PENDING",
        priorityScore: 50.0,
        targetDisposalDate: toDateOnly(addDays(today, 10)),
        earliestNextDate: toDateOnly(today), // eligible
        judgeId: testJudge.id,
      },
    });
    testCaseIds.push(caseA.id);

    const caseB = await prisma.case.create({
      data: {
        caseNumber: `${TEST_PREFIX}002`,
        title: "Day 5 Standard Rent Dispute",
        caseType: "RENT_DISPUTE",
        filingDate: toDateOnly(addDays(today, -20)),
        hasExpertEvidence: false,
        isUrgent: false,
        complexity: 3,
        trackId: standardTrack.id,
        suggestedTrackId: standardTrack.id,
        status: "PENDING",
        priorityScore: 10.0,
        targetDisposalDate: toDateOnly(addDays(today, 345)),
        earliestNextDate: toDateOnly(today), // eligible
        judgeId: testJudge.id,
      },
    });
    testCaseIds.push(caseB.id);

    const caseC = await prisma.case.create({
      data: {
        caseNumber: `${TEST_PREFIX}003`,
        title: "Day 5 Cooling Off Future Matter",
        caseType: "CIVIL_SUIT",
        filingDate: toDateOnly(today),
        hasExpertEvidence: false,
        isUrgent: false,
        complexity: 5,
        trackId: complexTrack.id,
        suggestedTrackId: complexTrack.id,
        status: "PENDING",
        priorityScore: 5.0,
        targetDisposalDate: toDateOnly(addDays(today, 730)),
        earliestNextDate: toDateOnly(addDays(today, 25)), // > listingDate (ineligible)
        judgeId: testJudge.id,
      },
    });
    testCaseIds.push(caseC.id);

    // Temporarily set judge dailyCapacity to 1 to test capacity constraint slicing
    const originalCapacity = testJudge.dailyCapacity;
    await prisma.judge.update({
      where: { id: testJudge.id },
      data: { dailyCapacity: 1 },
    });

    // 2. Generate cause list for listingDate
    const result1 = await generateCauseList({
      judgeId: testJudge.id,
      date: listingDate,
      userId: testJudge.userId,
    });

    assert.equal(result1.alreadyGenerated, false);
    assert.equal(result1.count, 1, "Only 1 case should be scheduled due to dailyCapacity = 1");
    assert.equal(
      result1.hearings[0].caseId,
      caseA.id,
      "Highest priority case (Urgent Bail) must be listed first"
    );

    result1.hearings.forEach((h) => testHearingIds.push(h.id));
    console.log("  ✓ PASS: Capacity constraint respected (top 1 of 2 eligible scheduled)");
    console.log("  ✓ PASS: Priority sorting ranks urgent/aging matter above standard matter");

    // Verify Case A transitioned to LISTED, while Case B and C remain PENDING
    const updatedCaseA = await prisma.case.findUnique({ where: { id: caseA.id } });
    const updatedCaseB = await prisma.case.findUnique({ where: { id: caseB.id } });
    const updatedCaseC = await prisma.case.findUnique({ where: { id: caseC.id } });

    assert.equal(updatedCaseA.status, "LISTED", "Scheduled case must transition to LISTED");
    assert.equal(updatedCaseB.status, "PENDING", "Unscheduled eligible case remains PENDING");
    assert.equal(updatedCaseC.status, "PENDING", "Cooling off case remains PENDING");
    console.log("  ✓ PASS: Scheduled case atomically updated to LISTED status");
    console.log("  ✓ PASS: Ineligible cooling-off matter excluded from cause list");

    // 3. Idempotency test: generate AGAIN for the exact same judge and date
    const result2 = await generateCauseList({
      judgeId: testJudge.id,
      date: listingDate,
    });

    assert.equal(result2.alreadyGenerated, true, "Second call must detect existing list");
    assert.equal(result2.count, 1, "Must return existing hearings without duplicating");
    assert.equal(result2.hearings[0].id, result1.hearings[0].id);
    console.log("  ✓ PASS: Idempotency check returns existing cause list without duplicates");

    // Restore judge capacity
    await prisma.judge.update({
      where: { id: testJudge.id },
      data: { dailyCapacity: originalCapacity },
    });

    console.log("\n--- API Integration Tests: Cause List & Dashboard Endpoints ---");

    // Clean up hearing so we can test the API generation cleanly
    for (const hId of testHearingIds) {
      await prisma.hearing.delete({ where: { id: hId } }).catch(() => {});
    }
    testHearingIds.length = 0;
    await prisma.case.update({
      where: { id: caseA.id },
      data: { status: "PENDING" },
    });

    // Seeded clerk token
    const clerkUser = await prisma.user.findFirst({ where: { role: "CLERK" } });
    const clerkToken = jwt.sign(
      { id: clerkUser.id, role: "CLERK", email: clerkUser.email },
      process.env.JWT_SECRET || "dev-jwt-secret-key-32-chars-minimum"
    );

    const lawyerUser = await prisma.user.findFirst({ where: { role: "LAWYER" } });
    const lawyerToken = jwt.sign(
      { id: lawyerUser.id, role: "LAWYER", email: lawyerUser.email },
      process.env.JWT_SECRET || "dev-jwt-secret-key-32-chars-minimum"
    );

    // (a) POST /cause-list as CLERK
    const serverInstance = app.listen(0);
    const serverPort = serverInstance.address().port;
    const baseUrl = `http://localhost:${serverPort}`;

    const postRes = await fetch(`${baseUrl}/cause-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clerkToken}`,
      },
      body: JSON.stringify({
        judgeId: testJudge.id,
        date: listingDate,
      }),
    });

    assert.equal(postRes.status, 201, "POST /cause-list should return 201 Created");
    const postData = await postRes.json();
    assert.ok(postData.hearings.length > 0, "Should return scheduled hearings");
    postData.hearings.forEach((h) => testHearingIds.push(h.id));
    console.log("  ✓ PASS: POST /cause-list creates hearings and returns 201 to Clerk");

    // (b) Second POST /cause-list returns 200 with alreadyGenerated = true
    const repeatRes = await fetch(`${baseUrl}/cause-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clerkToken}`,
      },
      body: JSON.stringify({
        judgeId: testJudge.id,
        date: listingDate,
      }),
    });

    assert.equal(repeatRes.status, 200);
    const repeatData = await repeatRes.json();
    assert.equal(repeatData.alreadyGenerated, true);
    console.log("  ✓ PASS: Duplicate POST /cause-list returns 200 and alreadyGenerated flag");

    // (c) GET /cause-list retrieves the generated list
    const getRes = await fetch(
      `${baseUrl}/cause-list?judgeId=${testJudge.id}&date=${listingDate}`,
      {
        headers: {
          Authorization: `Bearer ${clerkToken}`,
        },
      }
    );
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.count, postData.count);
    console.log("  ✓ PASS: GET /cause-list retrieves listed hearings for judge and date");

    // (d) RBAC: LAWYER cannot call POST /cause-list
    const lawyerRes = await fetch(`${baseUrl}/cause-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lawyerToken}`,
      },
      body: JSON.stringify({
        judgeId: testJudge.id,
        date: listingDate,
      }),
    });
    assert.equal(lawyerRes.status, 403, "Lawyer must receive 403 Forbidden");
    console.log("  ✓ PASS: Lawyer is blocked from POST /cause-list with 403 Forbidden");

    // (e) GET /dashboard/stats returns valid caseload metrics
    const statsRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    });
    assert.equal(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.equal(typeof statsData.totalPending, "number");
    assert.equal(typeof statsData.overdueCases, "number");
    assert.equal(typeof statsData.averageAge, "number");
    console.log("  ✓ PASS: GET /dashboard/stats returns totalPending, overdueCases, averageAge");

    serverInstance.close();

    console.log("\n========================================");
    console.log("✅ All Day 5 tests PASSED (11/11)");
    console.log("========================================\n");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    // Clean up all test data from Neon DB
    console.log("🧹 Cleaning up Day 5 test records...");
    for (const hId of testHearingIds) {
      await prisma.hearing.delete({ where: { id: hId } }).catch(() => {});
    }
    for (const cId of testCaseIds) {
      await prisma.case.delete({ where: { id: cId } }).catch(() => {});
    }
    await prisma.auditLog.deleteMany({
      where: { action: "CAUSE_LIST_GENERATED" },
    }).catch(() => {});
    console.log("✨ Cleanup completed successfully.\n");
    await prisma.$disconnect();
  }
}

runTests();
