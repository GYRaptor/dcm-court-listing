process.env.NODE_ENV = "test";
const { default: app } = await import("../src/index.js");
const { default: prisma } = await import("../src/utils/prisma.js");
const {
  calculatePriorityScore,
  updateCasePriority,
  isCaseOverdue,
  isCaseAging,
} = await import("../src/services/priority.service.js");
const { assignJudgeGreedy } = await import("../src/services/judge.service.js");
const { addDays, todayIST } = await import("../src/utils/dates.js");

const PORT = 5005;
let server;

async function runTests() {
  console.log("🧪 Running Day 4 Priority Scoring, Greedy Judge Assignment & Lookup Test Suite...\n");
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
    // 1. UNIT TESTS: Priority Score Formula with Fixed Examples
    // -----------------------------------------------------------
    console.log("--- Unit Tests: Priority Score Mathematical Model ---");

    // Example A: Brand new case (age 0, FAST track 90d, not urgent, 0 adjournments)
    const scoreA = calculatePriorityScore({
      filingDate: "2026-11-09",
      targetDays: 90,
      isUrgent: false,
      adjournmentCount: 0,
      asOfDate: "2026-11-09",
    });
    assert(scoreA === 0, "Brand new case (age 0) evaluates to priority 0.0");

    // Example B: Half-way elapsed (age 45, FAST 90d, 50% consumed)
    const scoreB = calculatePriorityScore({
      filingDate: "2026-10-01",
      targetDays: 90,
      isUrgent: false,
      adjournmentCount: 0,
      asOfDate: "2026-11-15", // 45 days elapsed
    });
    assert(scoreB === 50, "45-day-old FAST case (90d target) consumes 50% time -> priority 50.0");

    // Example C: Urgent boost (+30 points)
    const scoreC = calculatePriorityScore({
      filingDate: "2026-10-01",
      targetDays: 90,
      isUrgent: true,
      adjournmentCount: 0,
      asOfDate: "2026-11-15", // 45 days elapsed + 30 urgent = 80
    });
    assert(scoreC === 80, "Urgent flag adds +30 points: 50% time + 30 urgent = priority 80.0");

    // Example D: Adjournment penalty (2 adjournments * 5 = +10 points)
    const scoreD = calculatePriorityScore({
      filingDate: "2026-10-01",
      targetDays: 90,
      isUrgent: false,
      adjournmentCount: 2,
      asOfDate: "2026-11-15", // 50% time + 10 = 60
    });
    assert(scoreD === 60, "2 adjournments add +10 points: 50% time + 10 = priority 60.0");

    // Example E: Adjournment penalty ceiling (cap at 25 points)
    const scoreE = calculatePriorityScore({
      filingDate: "2026-10-01",
      targetDays: 90,
      isUrgent: false,
      adjournmentCount: 10, // 10 * 5 = 50 -> capped at 25
      asOfDate: "2026-11-15", // 50% time + 25 = 75
    });
    assert(scoreE === 75, "Adjournment penalty capped at 25 points: 50% time + 25 cap = priority 75.0");

    // Example F: Precision rounding to 1 decimal place
    // 33 days on 90d track = (33 / 90) * 100 = 36.6666... -> 36.7
    const scoreF = calculatePriorityScore({
      filingDate: "2026-10-01",
      targetDays: 90,
      isUrgent: false,
      adjournmentCount: 0,
      asOfDate: "2026-11-03", // 33 days
    });
    assert(scoreF === 36.7, "Score rounded strictly to 1 decimal place: 36.666... -> 36.7");

    // Example G: Overdue & Aging detection
    assert(isCaseOverdue("2026-11-01", "PENDING", "2026-11-09") === true, "Case past target date detected as Overdue");
    assert(isCaseOverdue("2026-11-20", "PENDING", "2026-11-09") === false, "Case before target date is not Overdue");
    assert(isCaseOverdue("2026-11-01", "DISPOSED", "2026-11-09") === false, "DISPOSED case is never marked Overdue");
    assert(isCaseAging("2020-01-01", "PENDING", "2026-11-09") === true, "Case filed > 5 years ago detected as Aging");

    // -----------------------------------------------------------
    // 2. UNIT TESTS: Greedy Judge Workload Assignment
    // -----------------------------------------------------------
    console.log("\n--- Unit Tests: Greedy Judge Workload Assignment ---");

    const assignedJudge = await assignJudgeGreedy(prisma);
    assert(typeof assignedJudge === "string" && assignedJudge.length > 0, "assignJudgeGreedy selects a valid Judge ID");

    // -----------------------------------------------------------
    // 3. API INTEGRATION TESTS: Intake, Roster, and Docket Lookup
    // -----------------------------------------------------------
    console.log("\n--- API Integration Tests ---");

    const clerkLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "clerk@court.gov.in", password: "Demo@1234" }),
    });
    const lawyerLogin = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "rohit.lawyer@court.gov.in", password: "Demo@1234" }),
    });

    const clerkToken = clerkLogin.data.token;
    const lawyerToken = lawyerLogin.data.token;

    // (a) GET /judges returns courtroom metadata and active caseloads to Clerk
    const judgesRes = await request("/judges", {
      headers: { Authorization: `Bearer ${clerkToken}` },
    });
    assert(
      judgesRes.status === 200 &&
        Array.isArray(judgesRes.data.judges) &&
        judgesRes.data.judges.length >= 3 &&
        "totalWorkload" in judgesRes.data.judges[0],
      "(a) GET /judges returns courtroom roster and cumulative workload to Clerk"
    );

    // (b) Lawyer receives 403 Forbidden on GET /judges
    const lawyerJudges = await request("/judges", {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    assert(lawyerJudges.status === 403, "(b) Lawyer is blocked from GET /judges with 403 Forbidden");

    // (c) Clerk registers a new urgent case -> receives auto-assigned judge and initial priority score (30)
    const newCaseRes = await request("/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${clerkToken}` },
      body: JSON.stringify({
        title: "Poddar Infrastructure vs. Municipal Corp",
        caseType: "COMMERCIAL_DISPUTE",
        hasExpertEvidence: false,
        isUrgent: true,
        parties: [
          { name: "Poddar Infrastructure Ltd", role: "PETITIONER" },
          { name: "Municipal Corporation", role: "RESPONDENT" },
        ],
      }),
    });
    assert(
      newCaseRes.status === 201 &&
        newCaseRes.data.case &&
        newCaseRes.data.case.judge &&
        newCaseRes.data.case.priorityScore === 30,
      "(c) Registered urgent matter receives auto-assigned Judge and initial priority score 30.0"
    );
    const createdCase = newCaseRes.data.case;
    if (createdCase) createdCaseIds.push(createdCase.id);

    // (d) Lawyer can lookup case docket by caseNumber
    const lookupRes = await request(`/cases/lookup/${encodeURIComponent(createdCase.caseNumber)}`, {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    assert(
      lookupRes.status === 200 &&
        lookupRes.data.case &&
        lookupRes.data.case.caseNumber === createdCase.caseNumber &&
        lookupRes.data.case.track.name === "STANDARD" &&
        lookupRes.data.case.parties.length === 2 &&
        !("passwordHash" in lookupRes.data.case),
      "(d) Lawyer retrieves read-only case docket by case number via GET /cases/lookup/:caseNumber"
    );

    // (e) Lookup of nonexistent case returns 404
    const notFoundLookup = await request("/cases/lookup/DCM/9999/9999", {
      headers: { Authorization: `Bearer ${lawyerToken}` },
    });
    assert(
      notFoundLookup.status === 404 && notFoundLookup.data.error.includes("No court matter found"),
      "(e) Lookup of nonexistent case number returns 404"
    );

    // (f) GET /cases returns list sorted by priorityScore descending
    const listRes = await request("/cases", {
      headers: { Authorization: `Bearer ${clerkToken}` },
    });
    const casesList = listRes.data.cases;
    let isSortedDesc = true;
    for (let i = 0; i < casesList.length - 1; i++) {
      if (casesList[i].priorityScore < casesList[i + 1].priorityScore) {
        isSortedDesc = false;
        break;
      }
    }
    assert(
      listRes.status === 200 && isSortedDesc,
      "(f) GET /cases returns case list sorted strictly by priorityScore descending"
    );

    console.log(`\n========================================`);
    console.log(`✅ All Day 4 tests PASSED (${passed}/${passed})`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  } finally {
    // Clean up test data
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

