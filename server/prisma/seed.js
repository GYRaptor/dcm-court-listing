import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Day 1 database seeding...");

  // 1. Seed Tracks (FAST, STANDARD, COMPLEX)
  const tracks = [
    {
      name: "FAST",
      targetDays: 90,
      gapDays: 7,
    },
    {
      name: "STANDARD",
      targetDays: 365,
      gapDays: 21,
    },
    {
      name: "COMPLEX",
      targetDays: 730,
      gapDays: 45,
    },
  ];

  for (const trackData of tracks) {
    const track = await prisma.track.upsert({
      where: { name: trackData.name },
      update: trackData,
      create: trackData,
    });
    console.log(`✓ Track ready: ${track.name} (target: ${track.targetDays}d, gap: ${track.gapDays}d)`);
  }

  // 2. Hash demo password for all seeded users
  const saltRounds = 10;
  const demoPassword = "Demo@1234";
  const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

  // 3. Seed Court Clerk
  const clerk = await prisma.user.upsert({
    where: { email: "clerk@court.gov.in" },
    update: {
      name: "Arun Verma (Court Clerk)",
      passwordHash,
      role: "CLERK",
    },
    create: {
      name: "Arun Verma (Court Clerk)",
      email: "clerk@court.gov.in",
      passwordHash,
      role: "CLERK",
    },
  });
  console.log(`✓ Clerk ready: ${clerk.email}`);

  // 4. Seed 3 Judges with different courtrooms and capacities
  const judgesData = [
    {
      name: "Justice Shalini Saxena",
      email: "judge.saxena@court.gov.in",
      courtroom: "Courtroom 101",
      dailyCapacity: 10,
    },
    {
      name: "Justice Rajesh Kumar",
      email: "judge.kumar@court.gov.in",
      courtroom: "Courtroom 102",
      dailyCapacity: 8,
    },
    {
      name: "Justice Priya Nair",
      email: "judge.nair@court.gov.in",
      courtroom: "Courtroom 103",
      dailyCapacity: 12,
    },
  ];

  for (const jData of judgesData) {
    const judgeUser = await prisma.user.upsert({
      where: { email: jData.email },
      update: {
        name: jData.name,
        passwordHash,
        role: "JUDGE",
      },
      create: {
        name: jData.name,
        email: jData.email,
        passwordHash,
        role: "JUDGE",
      },
    });

    const judgeProfile = await prisma.judge.upsert({
      where: { userId: judgeUser.id },
      update: {
        courtroom: jData.courtroom,
        dailyCapacity: jData.dailyCapacity,
      },
      create: {
        userId: judgeUser.id,
        courtroom: jData.courtroom,
        dailyCapacity: jData.dailyCapacity,
      },
    });

    console.log(
      `✓ Judge ready: ${judgeUser.name} (${jData.courtroom}, capacity: ${judgeProfile.dailyCapacity})`
    );
  }

  // 5. Seed Advocate / Lawyer
  const lawyer = await prisma.user.upsert({
    where: { email: "rohit.lawyer@court.gov.in" },
    update: {
      name: "Advocate Rohit Mehta",
      passwordHash,
      role: "LAWYER",
    },
    create: {
      name: "Advocate Rohit Mehta",
      email: "rohit.lawyer@court.gov.in",
      passwordHash,
      role: "LAWYER",
    },
  });
  console.log(`✓ Lawyer ready: ${lawyer.email}`);

  console.log("✅ Day 1 seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

