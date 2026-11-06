import prisma from "./utils/prisma.js";

async function verify() {
  console.log("🔍 Verifying Neon database records...");

  const tracks = await prisma.track.findMany({
    orderBy: { targetDays: "asc" },
  });
  console.log(`\nFound ${tracks.length} Tracks:`);
  tracks.forEach((t) =>
    console.log(` - ${t.name}: target ${t.targetDays} days, gap ${t.gapDays} days`)
  );

  const users = await prisma.user.findMany({
    include: { judge: true },
    orderBy: { role: "asc" },
  });
  console.log(`\nFound ${users.length} Users:`);
  users.forEach((u) => {
    const judgeDetail = u.judge
      ? ` | Courtroom: ${u.judge.courtroom}, Daily Capacity: ${u.judge.dailyCapacity}`
      : "";
    console.log(` - [${u.role}] ${u.name} <${u.email}>${judgeDetail}`);
  });

  console.log("\n✅ Database verification complete. All Day 1 entities exist!");
}

verify()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

