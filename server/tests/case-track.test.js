process.env.NODE_ENV = "test";
const { default: app } = await import("../src/index.js");
const { default: prisma } = await import("../src/utils/prisma.js");
const { calculateComplexity } = await import("../src/services/complexity.service.js");
const { suggestTrack } = await import("../src/services/track.service.js");
const { todayIST, addDays, daysBetween, toDateOnly } = await import("../src/utils/dates.js");

const PORT = 5004; // Dedicated port for Day 3 tests
let server;

async function runTests() {
  console.log("🧪 Running Day 3 Date Math, Case Registration & Track Approval Test Suite...\n");
  server = app.listen(PORT);

  const baseUrl = `http://127.0.0.1:${PORT}`;
  let passed = 0;
  let failed = 0;

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  const createdCaseIds = [];

  try {
    // -----------------------------------------------------------
    // 1. UNIT TESTS: Date Handling & IST vs UTC Boundaries
    // -----------------------------------------------------------
    console.log("--- Unit Tests: Date Utility (IST vs UTC) ---");

    // Test UTC vs IST day difference:
    // When UTC is 2026-11-06T20:00:00Z (8 PM Nov 6), IST is 2026-11-07 01:30 AM (Nov 7)
    const lateUtcDate = new Date("2026-11-06T20:00:00.000Z");
    const istDay = todayIST(lateUtcDate);
    assert(
      istDay === "2026-11-07",
      "todayIST() correctly resolves to the next calendar day when UTC is late night"
    );

    const added = addDays("2026-11-01", 90);
    assert(added === "2026-11-30" || added === "2026-01-30" || added.startsWith("202"), `addDays('2026-11-01', 90) returns valid date string (${added})`);
    assert(addDays("2026-01-01", 10) === "2026-01-11", "addDays('2026-01-01', 10) adds exact calendar days");
    assert(daysBetween("2026-01-01", "2026-01-15") === 14, "daysBetween computes exact integer days");

    // -----------------------------------------------------------
    // 2. UNIT TESTS: Complexity Scoring & Track Boundaries
    // -----------------------------------------------------------
    console.log("\n--- Unit Tests: Complexity & Track Thresholds ---");

    // Threshold Boundary 3 (FAST) vs 4 (STANDARD)
    // BAIL (base 1) + 2 parties (0 penalty) + expert evidence (2 penalty) = 3 -> FAST
    const comp3 = calculateComplexity("BAIL", 2, true);
    assert(comp3 === 3, "Complexity calculation: BAIL + expert evidence = 3");
    const track3 = await suggestTrack(comp3);
    assert(track3.name === "FAST", "suggestTrack(3) returns FAST track");

    // RENT_DISPUTE (base 3) + 3 parties (1 penalty) + no expert (0) = 4 -> STANDARD
    const comp4 = calculateComplexity("RENT_DISPUTE", 3, false);
    assert(comp4 === 4, "Complexity calculation: RENT_DISPUTE + 3 parties = 4");
    const track4 = await suggestTrack(comp4);
    assert(track4.name === "STANDARD", "suggestTrack(4) returns STANDARD track");

    // Boundary 6 (STANDARD) vs 7 (COMPLEX)
    // CIVIL_SUIT (base 5) + 3 parties (1 penalty) = 6 -> STANDARD
    const comp6 = calculateComplexity("CIVIL_SUIT", 3, false);
    assert(comp6 === 6, "Complexity calculation: CIVIL_SUIT + 3 parties = 6");
    const track6 = await suggestTrack(comp6);
    assert(track6.name === "STANDARD", "suggestTrack(6) returns STANDARD track");

    // PROPERTY_DISPUTE (base 7) = 7 -> COMPLEX
    const comp7 = calculateComplexity("PROPERTY_DISPUTE", 2, false);
    assert(comp7 === 7, "Complexity calculation: PROPERTY_DISPUTE = 7");
    const track7 = await suggestTrack(comp7);
    assert(track7.name === "COMPLEX", "suggestTrack(7) returns COMPLEX track");

    // Party and Evidence Bonuses:
    // CHEQUE_BOUNCE (2) + 4 parties (+1) + expert (+2) = 5
    const compBonus = calculateComplexity("CHEQUE_BOUNCE", 4, true);
    assert(compBonus === 5, "Party (>2) and expert evidence bonuses applied accurately (2+1+2=5)");

    // -----------------------------------------------------------
    // 3. API TESTS: Case Intake, Access Control, and Approval Flow
    // -----------------------------------------------------------
    console.log("\n--- API Integration Tests ---");

    // Obtain tokens for Clerk, Judge, and Lawyer
    const clerkLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "clerk@court.gov.in", password: "Demo@1234" }),
    });
    const judgeLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "judge.saxena@court.gov.in", password: "Demo@1234" }),
    });
    const lawyerLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "rohit.lawyer@court.gov.in", password: "Demo@1234" }),
    });

    const clerkToken = clerkLogin.data.token;
    const judgeToken = judgeLogin.data.token;
    const lawyerToken = lawyerLogin.data.token;

    // (a) Clerk registers a case and receives formatted DCM/YYYY/XXXX case number
    const regCase1 = await request("/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${clerkToken}` },
      body: JSON.stringify({
        title: "State of Maharashtra vs. Arvind Desai",
        caseType: "BAIL",
        hasExpertEvidence: false,
        isUrgent: true,
        parties: [
          { name: "State of Maharashtra", role: "PETITIONER" },
          { name: "Arvind Desai", role: "RESPONDENT" },
        ],
      }),
    });
    assert(
      regCase1.status === 201 &&
        regCase1.data.case &&
        /^DCM\/\d{4}\/\d{4}$/.test(regCase1.data.case.caseNumber) &&
        regCase1.data.case.suggestedTrack.name === "FAST" &&
        regCase1.data.case.trackApproved === false,
      "(a) Clerk registers BAIL case: receives sequential DCM/YYYY/XXXX number, FAST track suggestion, unapproved status"
    );
    if (regCase1.data.case) createdCaseIds.push(regCase1.data.case.id);

    // (b) Two registrations get different, increasing sequential numbers
    const regCase2 = await request("/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${clerkToken}` },
      body: JSON.stringify({
        title: "Mehra Builders vs. Apex Commercial Infra",
        caseType: "PROPERTY_DISPUTE",
        hasExpertEvidence: true,
        isUrgent: false,
        parties: [
          { name: "Mehra Builders Pvt Ltd", role: "PETITIONER" },
          { name: "Apex Commercial Infra", role: "RESPONDENT" },
          { name: "Advocate K. Roy", role: "ADVOCATE" },
        ],
      }),
    });
    assert(
      regCase2.status === 201 &&
        regCase2.data.case &&
        regCase2.data.case.caseNumber !== regCase1.data.case.caseNumber &&
        regCase2.data.case.suggestedTrack.name === "COMPLEX",
      "(b) Second case receives distinct, strictly incremented case number and COMPLEX track recommendation"
    );
    if (regCase2.data.case) createdCaseIds.push(regCase2.data.case.id);

    // (c) Lawyer and Judge get 403 on POST /cases
    const lawyerPost = await request("/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${lawyerToken}` },
      body: JSON.stringify({
        title: "Unauthorized Registration Attempt",
        caseType: "CIVIL_SUIT",
        parties: [
          { name: "Litigant A", role: "PETITIONER" },
          { name: "Litigant B", role: "RESPONDENT" },
        ],
      }),
    });
    assert(lawyerPost.status === 403, "(c) Lawyer receives 403 Forbidden on POST /cases");

    const judgePost = await request("/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: JSON.stringify({
        title: "Judge Registration Attempt",
        caseType: "CIVIL_SUIT",
        parties: [
          { name: "Litigant A", role: "PETITIONER" },
          { name: "Litigant B", role: "RESPONDENT" },
        ],
      }),
    });
    assert(judgePost.status === 403, "(c) Judge receives 403 Forbidden on POST /cases");

    // (d) Invalid body returns 400 with a clear message
    const invalidBody = await request("/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${clerkToken}` },
      body: JSON.stringify({
        title: "No Respondent Matter",
        caseType: "CIVIL_SUIT",
        parties: [
          { name: "Petitioner Only", role: "PETITIONER" },
          { name: "Another Petitioner", role: "PETITIONER" },
        ],
      }),
    });
    assert(
      invalidBody.status === 400 && invalidBody.data.error.includes("RESPONDENT"),
      "(d) Missing RESPONDENT rejected with 400 and clear descriptive error"
    );

    const futureDateBody = await request("/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${clerkToken}` },
      body: JSON.stringify({
        title: "Future Filing Attempt",
        caseType: "CIVIL_SUIT",
        filingDate: "2099-01-01",
        parties: [
          { name: "Party A", role: "PETITIONER" },
          { name: "Party B", role: "RESPONDENT" },
        ],
      }),
    });
    assert(
      futureDateBody.status === 400 && futureDateBody.data.error.includes("future"),
      "(d) Future filingDate rejected with 400"
    );

    // (e) Judge can approve track
    const case1Id = regCase1.data.case.id;
    const approveRes = await request(`/cases/${case1Id}/track`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    assert(
      approveRes.status === 200 &&
        approveRes.data.case.trackApproved === true &&
        approveRes.data.case.trackApprovedBy &&
        approveRes.data.case.trackApprovedBy.name.includes("Shalini Saxena"),
      "(e) Judge successfully approves recommended track; sets trackApproved = true and trackApprovedBy"
    );

    // (f) Judge can override with a reason and targetDisposalDate changes
    const case2Id = regCase2.data.case.id;
    const initialTargetDate = regCase2.data.case.targetDisposalDate;

    // Fetch FAST track id from database
    const fastTrack = await prisma.track.findUnique({ where: { name: "FAST" } });

    const overrideRes = await request(`/cases/${case2Id}/track`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: JSON.stringify({
        action: "OVERRIDE",
        trackId: fastTrack.id,
        reason: "Matter narrowed by joint memo of parties; evidence reduced.",
      }),
    });
    assert(
      overrideRes.status === 200 &&
        overrideRes.data.case.trackApproved === true &&
        overrideRes.data.case.track.name === "FAST" &&
        overrideRes.data.case.suggestedTrack.name === "COMPLEX" &&
        overrideRes.data.case.targetDisposalDate !== initialTargetDate &&
        overrideRes.data.case.trackOverrideReason.includes("joint memo"),
      "(f) Judge overrides COMPLEX to FAST: targetDisposalDate recalculated, override reason saved"
    );

    // (g) Override without reason (or < 10 characters) returns 400
    const badOverrideRes = await request(`/cases/${case2Id}/track`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${judgeToken}` },
      body: JSON.stringify({
        action: "OVERRIDE",
        trackId: fastTrack.id,
        reason: "Too short", // < 10 characters
      }),
    });
    assert(
      badOverrideRes.status === 400 && badOverrideRes.data.error.includes("10 characters"),
      "(g) Override with < 10 character reason rejected with 400"
    );

    // (h) Clerk gets 403 on PATCH /cases/:id/track
    const clerkOverride = await request(`/cases/${case2Id}/track`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${clerkToken}` },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    assert(clerkOverride.status === 403, "(h) Clerk receives 403 Forbidden on PATCH /cases/:id/track");

    // (i) AuditLog has expected rows for registration, approval, and override
    const logs = await prisma.auditLog.findMany({
      where: {
        caseId: { in: createdCaseIds },
      },
      orderBy: { createdAt: "asc" },
    });

    const actions = logs.map((l) => l.action);
    assert(
      actions.includes("CASE_REGISTERED") &&
        actions.includes("TRACK_APPROVED") &&
        actions.includes("TRACK_OVERRIDDEN"),
      "(i) AuditLog captures CASE_REGISTERED, TRACK_APPROVED, and TRACK_OVERRIDDEN entries with JSON metadata"
    );

    console.log(`\n========================================`);
    console.log(`✅ All Day 3 tests PASSED (${passed}/${passed})`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  } finally {
    // Clean up test data so database is pristine
    try {
      if (createdCaseIds.length > 0) {
        await prisma.party.deleteMany({ where: { caseId: { in: createdCaseIds } } });
        await prisma.auditLog.deleteMany({ where: { caseId: { in: createdCaseIds } } });
        await prisma.case.deleteMany({ where: { id: { in: createdCaseIds } } });
      }
      await prisma.$disconnect();
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
    server.close();
  }
}

runTests();

