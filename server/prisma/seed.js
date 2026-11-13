import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { todayIST, toDateOnly, addDays, daysBetween } from "../src/utils/dates.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting DCFM database seeding...");

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

  const trackMap = {};
  for (const trackData of tracks) {
    const track = await prisma.track.upsert({
      where: { name: trackData.name },
      update: trackData,
      create: trackData,
    });
    trackMap[track.name] = track;
    console.log(`✓ Track ready: ${track.name} (target: ${track.targetDays}d, gap: ${track.gapDays}d)`);
  }

  // 2. Hash demo password for all seeded users
  const saltRounds = 10;
  const demoPassword = "Demo@1234";
  const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

  // 3. Seed Court Clerk (clerk@court.gov.in)
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

  // 4. Seed Judges (saxena@court.gov.in, kumar@court.gov.in, etc.)
  const judgesData = [
    {
      name: "Justice Shalini Saxena",
      email: "saxena@court.gov.in",
      courtroom: "Courtroom 101",
      dailyCapacity: 10,
    },
    {
      name: "Justice Shalini Saxena",
      email: "judge.saxena@court.gov.in",
      courtroom: "Courtroom 101",
      dailyCapacity: 10,
    },
    {
      name: "Justice Rajesh Kumar",
      email: "kumar@court.gov.in",
      courtroom: "Courtroom 102",
      dailyCapacity: 8,
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

  const judgeMap = {};
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
      include: {
        user: true,
      },
    });

    judgeMap[jData.email] = judgeProfile;
    console.log(
      `✓ Judge ready: ${judgeUser.name} <${jData.email}> (${jData.courtroom}, capacity: ${judgeProfile.dailyCapacity})`
    );
  }

  // 5. Seed Advocate / Lawyer (rohit.lawyer@court.gov.in)
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

  // Base judges for case assignment
  const activeJudges = [
    judgeMap["saxena@court.gov.in"],
    judgeMap["kumar@court.gov.in"],
    judgeMap["judge.nair@court.gov.in"],
  ];

  const today = todayIST();

  // 6. 16 Realistic Cases across FAST, STANDARD, COMPLEX tracks
  const casesData = [
    // FAST Track Cases
    {
      caseNumber: "DCM/2026/0001",
      title: "State of Delhi vs. Rakesh Sharma",
      caseType: "BAIL",
      trackName: "FAST",
      daysAgo: 30,
      isUrgent: true,
      hasExpertEvidence: false,
      adjournmentCount: 0,
      status: "PENDING",
      parties: [
        { name: "State of Delhi (Prosecution)", role: "PETITIONER" },
        { name: "Rakesh Sharma", role: "RESPONDENT" },
        { name: "Advocate Rohit Mehta", role: "ADVOCATE" },
      ],
      hearings: [
        { daysOffset: -10, outcome: "HEARD", remarks: "Bail petition arguments advanced. Police diary produced." },
      ],
    },
    {
      caseNumber: "DCM/2026/0002",
      title: "Apex Logistics Ltd. vs. Om Exports",
      caseType: "CHEQUE_BOUNCE",
      trackName: "FAST",
      daysAgo: 110, // Overdue (> 90 days)
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 2,
      status: "PENDING",
      parties: [
        { name: "Apex Logistics Ltd.", role: "PETITIONER" },
        { name: "Om Exports & Anr.", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -40, outcome: "ADJOURNED", remarks: "Counsel for accused sought time for settlement talks." },
        { daysOffset: -15, outcome: "ADJOURNED", remarks: "Accused absent due to medical certificate." },
      ],
    },
    {
      caseNumber: "DCM/2026/0003",
      title: "Mohan Lal vs. Sunita Devi",
      caseType: "RENT_DISPUTE",
      trackName: "FAST",
      daysAgo: 45,
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 0,
      status: "LISTED",
      parties: [
        { name: "Mohan Lal", role: "PETITIONER" },
        { name: "Sunita Devi", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: 0, outcome: "SCHEDULED", remarks: "Daily cause list listing for evidence recording." },
      ],
    },
    {
      caseNumber: "DCM/2026/0004",
      title: "State of Delhi vs. Vijay Anand",
      caseType: "BAIL",
      trackName: "FAST",
      daysAgo: 95, // Overdue
      isUrgent: true,
      hasExpertEvidence: false,
      adjournmentCount: 1,
      status: "LISTED",
      parties: [
        { name: "State of Delhi", role: "PETITIONER" },
        { name: "Vijay Anand", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -20, outcome: "ADJOURNED", remarks: "IO directed to file status report." },
        { daysOffset: 0, outcome: "SCHEDULED", remarks: "Listed for final bail arguments." },
      ],
    },
    {
      caseNumber: "DCM/2026/0005",
      title: "Kaveri Traders vs. Zenith Global",
      caseType: "CHEQUE_BOUNCE",
      trackName: "FAST",
      daysAgo: 60,
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 0,
      status: "DISPOSED",
      disposedDaysAgo: 5,
      parties: [
        { name: "Kaveri Traders", role: "PETITIONER" },
        { name: "Zenith Global Corp", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -25, outcome: "HEARD", remarks: "Admission of liability recorded." },
        { daysOffset: -5, outcome: "DISPOSED", remarks: "Compounded under Section 147 of NI Act. Matter disposed." },
      ],
    },

    // STANDARD Track Cases
    {
      caseNumber: "DCM/2026/0006",
      title: "Ram Prakash & Ors. vs. Municipal Corp of Delhi",
      caseType: "CIVIL_SUIT",
      trackName: "STANDARD",
      daysAgo: 180,
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 1,
      status: "PENDING",
      parties: [
        { name: "Ram Prakash & Ors.", role: "PETITIONER" },
        { name: "Municipal Corporation of Delhi", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -45, outcome: "ADJOURNED", remarks: "Written statement taken on record." },
      ],
    },
    {
      caseNumber: "DCM/2026/0007",
      title: "Sunrise Builders vs. Horizon Estates",
      caseType: "PROPERTY_DISPUTE",
      trackName: "STANDARD",
      daysAgo: 390, // Overdue (> 365 days)
      isUrgent: false,
      hasExpertEvidence: true,
      adjournmentCount: 3,
      status: "PENDING",
      parties: [
        { name: "Sunrise Builders Pvt Ltd", role: "PETITIONER" },
        { name: "Horizon Estates LLP", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -90, outcome: "ADJOURNED", remarks: "Local Commissioner report awaited." },
        { daysOffset: -50, outcome: "HEARD", remarks: "Objections filed against LC report." },
        { daysOffset: -22, outcome: "ADJOURNED", remarks: "Cross-examination of PW-1 adjourned on request." },
      ],
    },
    {
      caseNumber: "DCM/2026/0008",
      title: "Sanjay Gupta vs. Amit Bansal",
      caseType: "COMMERCIAL_DISPUTE",
      trackName: "STANDARD",
      daysAgo: 210,
      isUrgent: true,
      hasExpertEvidence: false,
      adjournmentCount: 0,
      status: "LISTED",
      parties: [
        { name: "Sanjay Gupta", role: "PETITIONER" },
        { name: "Amit Bansal", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: 0, outcome: "SCHEDULED", remarks: "Commercial summary hearing on injunction." },
      ],
    },
    {
      caseNumber: "DCM/2026/0009",
      title: "Shanti Niwas Co-op Society vs. Ajay Verma",
      caseType: "RENT_DISPUTE",
      trackName: "STANDARD",
      daysAgo: 150,
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 0,
      status: "PENDING",
      parties: [
        { name: "Shanti Niwas CGHS", role: "PETITIONER" },
        { name: "Ajay Verma", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -30, outcome: "HEARD", remarks: "Issues framed. Evidence affidavits submitted." },
      ],
    },
    {
      caseNumber: "DCM/2026/0010",
      title: "National Textiles vs. Modern Fabrics",
      caseType: "CIVIL_SUIT",
      trackName: "STANDARD",
      daysAgo: 300,
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 1,
      status: "DISPOSED",
      disposedDaysAgo: 20,
      parties: [
        { name: "National Textiles Ltd", role: "PETITIONER" },
        { name: "Modern Fabrics Pvt Ltd", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -70, outcome: "ADJOURNED", remarks: "Parties referred to Delhi High Court Mediation Centre." },
        { daysOffset: -20, outcome: "DISPOSED", remarks: "Decreed in terms of settlement agreement." },
      ],
    },

    // COMPLEX Track Cases
    {
      caseNumber: "DCM/2026/0011",
      title: "Reliance Infra Consortium vs. State Highway Auth",
      caseType: "COMMERCIAL_DISPUTE",
      trackName: "COMPLEX",
      daysAgo: 400,
      isUrgent: true,
      hasExpertEvidence: true,
      adjournmentCount: 2,
      status: "PENDING",
      parties: [
        { name: "Reliance Infra Consortium", role: "PETITIONER" },
        { name: "State Highway Authority of India", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -120, outcome: "ADJOURNED", remarks: "Expert witness from IIT Delhi summoned." },
        { daysOffset: -60, outcome: "HEARD", remarks: "Structural engineering evidence examined." },
      ],
    },
    {
      caseNumber: "DCM/2026/0012",
      title: "Mehra Family Trust vs. Anand Swaroop & Co",
      caseType: "PROPERTY_DISPUTE",
      trackName: "COMPLEX",
      daysAgo: 760, // Overdue (> 730 days)
      isUrgent: false,
      hasExpertEvidence: true,
      adjournmentCount: 4,
      status: "PENDING",
      parties: [
        { name: "Mehra Family Trust & Ors.", role: "PETITIONER" },
        { name: "Anand Swaroop & Co", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -180, outcome: "ADJOURNED", remarks: "Revenue records from Sub-Registrar awaited." },
        { daysOffset: -110, outcome: "ADJOURNED", remarks: "Demarcation report incomplete." },
        { daysOffset: -50, outcome: "HEARD", remarks: "Cross-examination of revenue officer completed." },
      ],
    },
    {
      caseNumber: "DCM/2026/0013",
      title: "Bharat Petrochemicals vs. Northern Refineries",
      caseType: "COMMERCIAL_DISPUTE",
      trackName: "COMPLEX",
      daysAgo: 500,
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 1,
      status: "LISTED",
      parties: [
        { name: "Bharat Petrochemicals Ltd", role: "PETITIONER" },
        { name: "Northern Refineries Corp", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -75, outcome: "ADJOURNED", remarks: "Joint audit statement directed." },
        { daysOffset: 0, outcome: "SCHEDULED", remarks: "Hearing on arbitration claim enforcement." },
      ],
    },
    {
      caseNumber: "DCM/2026/0014",
      title: "Greenfield Township Allottees vs. Urban Dev Authority",
      caseType: "CIVIL_SUIT",
      trackName: "COMPLEX",
      daysAgo: 620,
      isUrgent: false,
      hasExpertEvidence: true,
      adjournmentCount: 1,
      status: "PENDING",
      parties: [
        { name: "Greenfield Allottees Welfare Assoc.", role: "PETITIONER" },
        { name: "Delhi Urban Development Authority", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -65, outcome: "HEARD", remarks: "Interim protection granted against demolition." },
      ],
    },
    {
      caseNumber: "DCM/2026/0015",
      title: "Global Telecom Towers vs. Spectrum Infotech",
      caseType: "COMMERCIAL_DISPUTE",
      trackName: "COMPLEX",
      daysAgo: 710,
      isUrgent: false,
      hasExpertEvidence: false,
      adjournmentCount: 2,
      status: "DISPOSED",
      disposedDaysAgo: 10,
      parties: [
        { name: "Global Telecom Towers Ltd", role: "PETITIONER" },
        { name: "Spectrum Infotech Services", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -100, outcome: "ADJOURNED", remarks: "Final arguments commenced." },
        { daysOffset: -10, outcome: "DISPOSED", remarks: "Pronounced in open court. Claim dismissed with costs." },
      ],
    },
    {
      caseNumber: "DCM/2026/0016",
      title: "Dr. Arvind Sen vs. State Medical Board",
      caseType: "CIVIL_SUIT",
      trackName: "STANDARD",
      daysAgo: 90,
      isUrgent: true,
      hasExpertEvidence: false,
      adjournmentCount: 0,
      status: "PENDING",
      parties: [
        { name: "Dr. Arvind Sen", role: "PETITIONER" },
        { name: "Delhi Medical Council", role: "RESPONDENT" },
      ],
      hearings: [
        { daysOffset: -15, outcome: "HEARD", remarks: "Reply filed by State Medical Board." },
      ],
    },
  ];

  console.log(`\n📋 Seeding ${casesData.length} court matters across judicial benches...`);

  // Complexity baseline table
  const complexityMap = {
    BAIL: 1,
    CHEQUE_BOUNCE: 2,
    RENT_DISPUTE: 3,
    CIVIL_SUIT: 5,
    COMMERCIAL_DISPUTE: 6,
    PROPERTY_DISPUTE: 6,
  };

  for (let i = 0; i < casesData.length; i++) {
    const item = casesData[i];
    const track = trackMap[item.trackName];
    const assignedJudge = activeJudges[i % activeJudges.length];

    const filingDateStr = addDays(today, -item.daysAgo);
    const targetDisposalDateStr = addDays(filingDateStr, track.targetDays);
    const earliestNextDateStr = addDays(today, item.status === "LISTED" ? 0 : 7);

    // Compute complexity score
    let complexity = complexityMap[item.caseType] || 3;
    if (item.hasExpertEvidence) complexity += 3;

    // Compute priority score
    const ageInDays = item.daysAgo;
    const basePriority = (ageInDays / track.targetDays) * 100;
    const urgencyWeight = item.isUrgent ? 30 : 0;
    const adjournmentWeight = Math.min(5 * item.adjournmentCount, 25);
    const priorityScore = Math.round((basePriority + urgencyWeight + adjournmentWeight) * 10) / 10;

    const disposedDate = item.disposedDaysAgo
      ? toDateOnly(addDays(today, -item.disposedDaysAgo))
      : null;

    // 6a. Upsert Case
    const courtCase = await prisma.case.upsert({
      where: { caseNumber: item.caseNumber },
      update: {
        title: item.title,
        caseType: item.caseType,
        filingDate: toDateOnly(filingDateStr),
        hasExpertEvidence: item.hasExpertEvidence,
        isUrgent: item.isUrgent,
        complexity,
        suggestedTrackId: track.id,
        trackId: track.id,
        trackApproved: true,
        trackApprovedById: assignedJudge.userId,
        status: item.status,
        priorityScore,
        targetDisposalDate: toDateOnly(targetDisposalDateStr),
        earliestNextDate: toDateOnly(earliestNextDateStr),
        adjournmentCount: item.adjournmentCount,
        disposedDate,
        judgeId: assignedJudge.id,
      },
      create: {
        caseNumber: item.caseNumber,
        title: item.title,
        caseType: item.caseType,
        filingDate: toDateOnly(filingDateStr),
        hasExpertEvidence: item.hasExpertEvidence,
        isUrgent: item.isUrgent,
        complexity,
        suggestedTrackId: track.id,
        trackId: track.id,
        trackApproved: true,
        trackApprovedById: assignedJudge.userId,
        status: item.status,
        priorityScore,
        targetDisposalDate: toDateOnly(targetDisposalDateStr),
        earliestNextDate: toDateOnly(earliestNextDateStr),
        adjournmentCount: item.adjournmentCount,
        disposedDate,
        judgeId: assignedJudge.id,
      },
    });

    // 6b. Upsert Parties
    for (const p of item.parties) {
      const existingParty = await prisma.party.findFirst({
        where: { caseId: courtCase.id, name: p.name, role: p.role },
      });
      if (!existingParty) {
        await prisma.party.create({
          data: {
            caseId: courtCase.id,
            name: p.name,
            role: p.role,
          },
        });
      }
    }

    // 6c. Seed Hearings
    for (const h of item.hearings) {
      const hearingDateStr = addDays(today, h.daysOffset);
      const existingHearing = await prisma.hearing.findFirst({
        where: {
          caseId: courtCase.id,
          hearingDate: toDateOnly(hearingDateStr),
        },
      });

      if (!existingHearing) {
        await prisma.hearing.create({
          data: {
            caseId: courtCase.id,
            judgeId: assignedJudge.id,
            hearingDate: toDateOnly(hearingDateStr),
            outcome: h.outcome,
            remarks: h.remarks,
          },
        });
      }
    }

    // 6d. Seed Audit Logs
    const existingLog = await prisma.auditLog.findFirst({
      where: { caseId: courtCase.id, action: "CASE_REGISTERED" },
    });
    if (!existingLog) {
      await prisma.auditLog.create({
        data: {
          userId: clerk.id,
          caseId: courtCase.id,
          action: "CASE_REGISTERED",
          details: JSON.stringify({
            caseNumber: courtCase.caseNumber,
            title: courtCase.title,
            suggestedTrack: track.name,
            complexity,
          }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: assignedJudge.userId,
          caseId: courtCase.id,
          action: "TRACK_APPROVED",
          details: JSON.stringify({
            caseNumber: courtCase.caseNumber,
            approvedTrack: track.name,
            assignedCourtroom: assignedJudge.courtroom,
          }),
        },
      });

      if (item.status === "LISTED") {
        await prisma.auditLog.create({
          data: {
            userId: assignedJudge.userId,
            caseId: courtCase.id,
            action: "CAUSE_LIST_GENERATED",
            details: JSON.stringify({
              caseNumber: courtCase.caseNumber,
              courtroom: assignedJudge.courtroom,
              listingDate: today,
              priorityScore,
            }),
          },
        });
      } else if (item.status === "DISPOSED") {
        await prisma.auditLog.create({
          data: {
            userId: assignedJudge.userId,
            caseId: courtCase.id,
            action: "OUTCOME_RECORDED",
            details: JSON.stringify({
              caseNumber: courtCase.caseNumber,
              outcome: "DISPOSED",
              decreeDate: item.disposedDaysAgo ? addDays(today, -item.disposedDaysAgo) : today,
            }),
          },
        });
      }
    }

    console.log(
      `✓ Case ready: ${courtCase.caseNumber} [${track.name}] (Priority: ${priorityScore}, ${item.status}) -> ${assignedJudge.courtroom}`
    );
  }

  console.log("\n✅ All 16 cases, hearings, parties, and audit logs seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
