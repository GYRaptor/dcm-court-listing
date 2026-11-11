process.env.NODE_ENV = "test";
import assert from "node:assert/strict";
import prisma from "../src/utils/prisma.js";
import { generateCauseList } from "../src/services/causelist.service.js";
import { todayIST, toDateOnly, addDays, formatDateString } from "../src/utils/dates.js";
import app from "../src/index.js";
import jwt from "jsonwebtoken";

const testCaseIds = [];
const testHearingIds = [];

async function runTests() {
  console.log("🧪 Running Day 6 Hearing Outcomes & Rescheduling Test Suite...\n");

  // Pre-cleanup any stale records from previous failed runs
  await prisma.case.deleteMany({ where: { caseNumber: { startsWith: "TEST_DAY6_" } } }).catch(() => {});

  const tracks = await prisma.track.findMany();
  const fastTrack = tracks.find((t) => t.name === "FAST");
  const standardTrack = tracks.find((t) => t.name === "STANDARD");

  const testJudge = await prisma.judge.findFirst({ include: { user: true } });
  assert.ok(testJudge, "Seeded judge must exist");

  const judgeUser = testJudge.user;
  const clerkUser = await prisma.user.findFirst({ where: { role: "CLERK" } });
  const lawyerUser = await prisma.user.findFirst({ where: { role: "LAWYER" } });

  const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-key-32-chars-minimum";
  const judgeToken = jwt.sign({ id: judgeUser.id, role: "JUDGE" }, JWT_SECRET);
  const clerkToken = jwt.sign({ id: clerkUser.id, role: "CLERK" }, JWT_SECRET);
  const lawyerToken = jwt.sign({ id: lawyerUser.id, role: "LAWYER" }, JWT_SECRET);

  const today = todayIST();
  const listingDate = addDays(today, 5);

  // Create a FAST track test case with earliestNextDate in the past (eligible for listing)
  const bail1 = await prisma.case.create({
    data: {
      caseNumber: `TEST_DAY6_${Date.now()}A`,
      title: "Day 6 Bail Hearing Alpha",
      caseType: "BAIL",
      filingDate: toDateOnly(addDays(today, -60)),
      hasExpertEvidence: false,
      isUrgent: false,
      complexity: 1,
      trackId: fastTrack.id,
      suggestedTrackId: fastTrack.id,
      status: "PENDING",
      priorityScore: 40.0,
      targetDisposalDate: toDateOnly(addDays(today, 30)),
      earliestNextDate: toDateOnly(today),
      judgeId: testJudge.id,
    },
  });
  testCaseIds.push(bail1.id);

  // Generate a cause list to create a SCHEDULED hearing for listingDate
  const listResult = await generateCauseList({
    judgeId: testJudge.id,
    date: listingDate,
    userId: clerkUser.id,
  });

  assert.ok(listResult.hearings.length > 0, "At least one hearing must be scheduled");

  // Find the hearing that belongs to our test case
  const testHearing = listResult.hearings.find((h) => h.caseId === bail1.id);
  assert.ok(testHearing, "Our test case must appear in the cause list");
  testHearingIds.push(testHearing.id);

  const serverInstance = app.listen(0);
  const port = serverInstance.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log("--- Unit Tests: Outcome Transition Logic ---");

  // (a) PATCH /hearings/:id/outcome — HEARD outcome, check case goes PENDING
  const heardRes = await fetch(`${baseUrl}/hearings/${testHearing.id}/outcome`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${judgeToken}` },
    body: JSON.stringify({ outcome: "HEARD", remarks: "Submissions complete. Judgment reserved." }),
  });

  assert.equal(heardRes.status, 200, "HEARD outcome must return 200");
  const heardData = await heardRes.json();
  assert.equal(heardData.hearing.outcome, "HEARD");
  assert.ok(heardData.nextEligibleDate, "Next eligible date must be returned after HEARD");

  // Check case transitioned back to PENDING
  const refreshedCase = await prisma.case.findUnique({ where: { id: bail1.id } });
  assert.equal(refreshedCase.status, "PENDING", "Case must revert to PENDING after HEARD outcome");

  const expectedNextDate = addDays(formatDateString(testHearing.hearingDate), fastTrack.gapDays);
  assert.equal(
    formatDateString(refreshedCase.earliestNextDate),
    expectedNextDate,
    `earliestNextDate must be hearingDate + ${fastTrack.gapDays} gap days`
  );
  console.log(`  ✓ PASS: HEARD outcome moves case to PENDING with earliestNextDate = hearingDate + ${fastTrack.gapDays} gap days`);

  // (b) Re-recording an already-completed hearing must fail with 409
  const duplicateRes = await fetch(`${baseUrl}/hearings/${testHearing.id}/outcome`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${judgeToken}` },
    body: JSON.stringify({ outcome: "ADJOURNED" }),
  });
  assert.equal(duplicateRes.status, 409, "Re-recording outcome must fail with 409 Conflict");
  console.log("  ✓ PASS: Re-recording already-recorded outcome returns 409 Conflict");

  // (c) LAWYER cannot record outcomes
  const forbiddenRes = await fetch(`${baseUrl}/hearings/${testHearing.id}/outcome`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lawyerToken}` },
    body: JSON.stringify({ outcome: "HEARD" }),
  });
  assert.equal(forbiddenRes.status, 403, "Lawyer must be blocked with 403");
  console.log("  ✓ PASS: Lawyer is blocked from recording outcomes with 403 Forbidden");

  // (d) GET /hearings/mine — clerk cannot access judge's mine route
  const clerkMineRes = await fetch(`${baseUrl}/hearings/mine`, {
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
  assert.equal(clerkMineRes.status, 403, "Clerk must receive 403 on /hearings/mine");
  console.log("  ✓ PASS: Clerk is blocked from GET /hearings/mine with 403 Forbidden");

  console.log("\n--- Full End-to-End Loop: Adjourn → Relist ---");

  // Create a fresh STANDARD case for the adjourn loop
  const suit1 = await prisma.case.create({
    data: {
      caseNumber: `TEST_DAY6_${Date.now()}B`,
      title: "Day 6 Rent Dispute Adjourn Loop",
      caseType: "RENT_DISPUTE",
      filingDate: toDateOnly(addDays(today, -50)),
      hasExpertEvidence: false,
      isUrgent: false,
      complexity: 3,
      trackId: standardTrack.id,
      suggestedTrackId: standardTrack.id,
      status: "PENDING",
      priorityScore: 20.0,
      targetDisposalDate: toDateOnly(addDays(today, 315)),
      earliestNextDate: toDateOnly(today),
      judgeId: testJudge.id,
    },
  });
  testCaseIds.push(suit1.id);

  // List it on a fresh date
  const listing2Date = addDays(today, 15);
  const list2 = await generateCauseList({
    judgeId: testJudge.id,
    date: listing2Date,
    userId: clerkUser.id,
  });
  const suit1Hearing = list2.hearings.find((h) => h.caseId === suit1.id);
  assert.ok(suit1Hearing, "Suit must appear in second cause list");
  testHearingIds.push(suit1Hearing.id);

  // Adjourn the hearing
  const adjournRes = await fetch(`${baseUrl}/hearings/${suit1Hearing.id}/outcome`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${judgeToken}` },
    body: JSON.stringify({ outcome: "ADJOURNED", remarks: "Respondent counsel absent." }),
  });
  assert.equal(adjournRes.status, 200);
  const adjournData = await adjournRes.json();
  assert.equal(adjournData.hearing.outcome, "ADJOURNED");

  const adjournedCase = await prisma.case.findUnique({ where: { id: suit1.id } });
  assert.equal(adjournedCase.status, "PENDING", "Adjourned case returns to PENDING");
  assert.equal(adjournedCase.adjournmentCount, 1, "adjournmentCount must increment on ADJOURNMENT");

  const expectedGapDate = addDays(listing2Date, standardTrack.gapDays);
  assert.equal(
    formatDateString(adjournedCase.earliestNextDate),
    expectedGapDate,
    `earliestNextDate after adjournment = listingDate + ${standardTrack.gapDays} gap days`
  );
  console.log(`  ✓ PASS: ADJOURNED outcome increments adjournmentCount and enforces ${standardTrack.gapDays}-day cooling gap`);

  // Now generate a cause list AFTER the gap — the case should re-appear
  const afterGapDate = addDays(expectedGapDate, 1);
  const list3 = await generateCauseList({
    judgeId: testJudge.id,
    date: afterGapDate,
    userId: clerkUser.id,
  });
  const reListedHearing = list3.hearings.find((h) => h.caseId === suit1.id);
  assert.ok(reListedHearing, "Adjourned case must re-appear in cause list after cooling gap");
  testHearingIds.push(reListedHearing.id);
  console.log("  ✓ PASS: Adjourned case re-appears in cause list after cooling-off gap expires");

  // (e) Dispose the case and verify status and disposedDate
  const disposeRes = await fetch(`${baseUrl}/hearings/${reListedHearing.id}/outcome`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${judgeToken}` },
    body: JSON.stringify({ outcome: "DISPOSED", remarks: "Settlement reached. Decree signed." }),
  });
  assert.equal(disposeRes.status, 200);
  const disposedCase = await prisma.case.findUnique({ where: { id: suit1.id } });
  assert.equal(disposedCase.status, "DISPOSED");
  assert.ok(disposedCase.disposedDate, "disposedDate must be set on DISPOSE outcome");
  console.log("  ✓ PASS: DISPOSED outcome sets case status to DISPOSED and records disposedDate");

  serverInstance.close();

  console.log("\n========================================");
  console.log("✅ All Day 6 tests PASSED (8/8)");
  console.log("========================================\n");

  // Cleanup
  console.log("🧹 Cleaning up Day 6 test records...");
  for (const hId of testHearingIds) {
    await prisma.hearing.delete({ where: { id: hId } }).catch(() => {});
  }
  for (const cId of testCaseIds) {
    await prisma.case.delete({ where: { id: cId } }).catch(() => {});
  }
  await prisma.auditLog.deleteMany({
    where: { action: "OUTCOME_RECORDED" },
  }).catch(() => {});
  console.log("✨ Cleanup completed.\n");
  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});

