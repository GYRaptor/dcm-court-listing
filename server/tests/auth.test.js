process.env.NODE_ENV = "test";
const { default: app } = await import("../src/index.js");

const PORT = 5003; // Dedicated test port
let server;

async function runTests() {
  console.log("🧪 Running Day 2 Authentication & Role Authorization Test Suite...\n");
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

  try {
    // (a) A new LAWYER can register and log in
    const testEmail = `advocate.test.${Date.now()}@court.gov.in`;
    const regRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Advocate Sunita Rao",
        email: testEmail,
        password: "SecurePassword123!",
      }),
    });
    assert(
      regRes.status === 201 &&
        regRes.data.token &&
        regRes.data.user.role === "LAWYER",
      "(a) New LAWYER registers successfully with 201 and receives JWT"
    );

    const loginNewLawyer = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        password: "SecurePassword123!",
      }),
    });
    assert(
      loginNewLawyer.status === 200 && loginNewLawyer.data.token,
      "(a) Newly registered LAWYER logs in successfully with 200"
    );

    // (b) Seeded clerk, judge, and lawyer can all log in with Demo@1234
    const loginClerk = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "clerk@court.gov.in",
        password: "Demo@1234",
      }),
    });
    assert(
      loginClerk.status === 200 && loginClerk.data.user.role === "CLERK",
      "(b) Seeded Court Clerk logs in with Demo@1234"
    );

    const loginJudge = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "judge.saxena@court.gov.in",
        password: "Demo@1234",
      }),
    });
    assert(
      loginJudge.status === 200 &&
        loginJudge.data.user.role === "JUDGE" &&
        loginJudge.data.user.judge.courtroom === "Courtroom 101",
      "(b) Seeded Judge logs in with Demo@1234 and retrieves courtroom metadata"
    );

    const loginLawyer = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "rohit.lawyer@court.gov.in",
        password: "Demo@1234",
      }),
    });
    assert(
      loginLawyer.status === 200 && loginLawyer.data.user.role === "LAWYER",
      "(b) Seeded Lawyer logs in with Demo@1234"
    );

    // (c) Wrong password returns 401 with generic message
    const loginWrongPass = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "clerk@court.gov.in",
        password: "WrongPassword999",
      }),
    });
    assert(
      loginWrongPass.status === 401 &&
        loginWrongPass.data.error === "Invalid email or password",
      "(c) Wrong password returns 401 'Invalid email or password'"
    );

    // (d) Registering with role "JUDGE" in body still creates a LAWYER
    const exploitEmail = `spoof.judge.${Date.now()}@court.gov.in`;
    const regSpoof = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Attacker Trying Judge Escalation",
        email: exploitEmail,
        password: "Password123!",
        role: "JUDGE", // Attempting privilege escalation
      }),
    });
    assert(
      regSpoof.status === 201 && regSpoof.data.user.role === "LAWYER",
      "(d) Request body role 'JUDGE' is ignored and user is created strictly as LAWYER"
    );

    // (e) Clerk can reach /auth/clerk-only but gets 403 on /auth/judge-only
    const clerkAllowed = await request("/auth/clerk-only", {
      headers: { Authorization: `Bearer ${loginClerk.data.token}` },
    });
    assert(
      clerkAllowed.status === 200 && clerkAllowed.data.message.includes("Clerk"),
      "(e) Clerk accesses /auth/clerk-only with status 200"
    );

    const clerkForbidden = await request("/auth/judge-only", {
      headers: { Authorization: `Bearer ${loginClerk.data.token}` },
    });
    assert(
      clerkForbidden.status === 403 &&
        clerkForbidden.data.error.includes("Requires JUDGE role"),
      "(e) Clerk is blocked from /auth/judge-only with 403 Forbidden"
    );

    // (f) Request with no token or bad token gets 401
    const noTokenRes = await request("/auth/clerk-only");
    assert(
      noTokenRes.status === 401 &&
        noTokenRes.data.error.includes("Missing or invalid token"),
      "(f) Request with no Authorization header receives 401"
    );

    const badTokenRes = await request("/auth/clerk-only", {
      headers: { Authorization: "Bearer forged-or-corrupted-jwt-token" },
    });
    assert(
      badTokenRes.status === 401 &&
        badTokenRes.data.error.includes("Invalid or expired token"),
      "(f) Request with forged token receives 401"
    );

    // (g) passwordHash never appears in any response
    const meRes = await request("/auth/me", {
      headers: { Authorization: `Bearer ${loginJudge.data.token}` },
    });
    const responsesToCheck = [
      regRes.data,
      loginNewLawyer.data,
      loginClerk.data,
      loginJudge.data,
      meRes.data,
    ];

    const hasLeakedHash = responsesToCheck.some(
      (resp) =>
        JSON.stringify(resp).includes("passwordHash") ||
        (resp.user && "passwordHash" in resp.user)
    );
    assert(
      !hasLeakedHash,
      "(g) passwordHash is never returned in registration, login, or /me responses"
    );

    console.log(`\n========================================`);
    console.log(`✅ All Day 2 backend test suites PASSED (${passed}/${passed})`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
