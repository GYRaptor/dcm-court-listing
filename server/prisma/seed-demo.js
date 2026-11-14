import defaultPrisma from "../src/utils/prisma.js";
import bcrypt from "bcrypt";
import { todayIST, toDateOnly, addDays, daysBetween } from "../src/utils/dates.js";
import { calculateComplexity } from "../src/services/complexity.service.js";
import { calculatePriorityScore, isCaseOverdue, isCaseAging } from "../src/services/priority.service.js";

const isDryRun = process.argv.includes("--dry-run");

// -------------------------------------------------------------
// 45 REALISTIC DISTRICT COURT CASES
// -------------------------------------------------------------
const DEMO_CASES = [
  // FAST Track Matters (16 cases: Bail, Cheque Bounce, Rent Disputes)
  {
    caseNumber: "DCM/2026/0101",
    title: "State of NCT of Delhi vs. Gurpreet Singh",
    caseType: "BAIL",
    targetTrackName: "FAST",
    daysAgo: 18,
    isUrgent: true,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "State of NCT of Delhi (Prosecution)", role: "PETITIONER" },
      { name: "Gurpreet Singh", role: "RESPONDENT" },
      { name: "Advocate Rohit Mehta", role: "ADVOCATE" },
    ],
    hearings: [
      { daysOffset: -8, outcome: "HEARD", remarks: "Bail petition arguments advanced. Police diary produced." },
    ],
  },
  {
    caseNumber: "DCM/2026/0102",
    title: "HDFC Bank Ltd. vs. Amit Paper Mart",
    caseType: "CHEQUE_BOUNCE",
    targetTrackName: "FAST",
    daysAgo: 45,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "HDFC Bank Ltd.", role: "PETITIONER" },
      { name: "Amit Paper Mart", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -20, outcome: "ADJOURNED", remarks: "Accused sought accommodation for settlement verification." },
    ],
  },
  {
    caseNumber: "DCM/2026/0103",
    title: "Sudha Narang vs. Harish Chander",
    caseType: "RENT_DISPUTE",
    targetTrackName: "FAST",
    daysAgo: 22,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: false, // Awaiting review
    parties: [
      { name: "Sudha Narang", role: "PETITIONER" },
      { name: "Harish Chander", role: "RESPONDENT" },
    ],
    hearings: [],
  },
  {
    caseNumber: "DCM/2026/0104",
    title: "ICICI Bank Ltd. vs. Modern Electronics",
    caseType: "CHEQUE_BOUNCE",
    targetTrackName: "FAST",
    daysAgo: 105, // Overdue (> 90d)
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 2,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "ICICI Bank Ltd.", role: "PETITIONER" },
      { name: "Modern Electronics & Anr.", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -50, outcome: "ADJOURNED", remarks: "Settlement negotiations ongoing before Mediation Centre." },
      { daysOffset: -20, outcome: "ADJOURNED", remarks: "Counsel for accused absent on ground of personal bereavement." },
    ],
  },
  {
    caseNumber: "DCM/2026/0105",
    title: "State of NCT of Delhi vs. Salman Khan",
    caseType: "BAIL",
    targetTrackName: "FAST",
    daysAgo: 8,
    isUrgent: true,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "LISTED",
    trackApproved: true,
    parties: [
      { name: "State of NCT of Delhi", role: "PETITIONER" },
      { name: "Salman Khan", role: "RESPONDENT" },
      { name: "Advocate Rohit Mehta", role: "ADVOCATE" },
    ],
    hearings: [
      { daysOffset: 0, outcome: "SCHEDULED", remarks: "Urgent interim bail application listed for orders." },
    ],
  },
  {
    caseNumber: "DCM/2026/0106",
    title: "Rameshwar Dayal vs. Bal Kishan",
    caseType: "RENT_DISPUTE",
    targetTrackName: "FAST",
    daysAgo: 98, // Overdue (> 90d)
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Rameshwar Dayal", role: "PETITIONER" },
      { name: "Bal Kishan", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -30, outcome: "ADJOURNED", remarks: "Petitioner directed to submit municipal property tax receipts." },
    ],
  },
  {
    caseNumber: "DCM/2026/0107",
    title: "Kotak Mahindra Prime vs. Rajendra Kumar",
    caseType: "CHEQUE_BOUNCE",
    targetTrackName: "FAST",
    daysAgo: 65,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "DISPOSED",
    disposedDaysAgo: 5,
    trackApproved: true,
    parties: [
      { name: "Kotak Mahindra Prime Ltd.", role: "PETITIONER" },
      { name: "Rajendra Kumar", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -25, outcome: "HEARD", remarks: "Compounding application filed under Section 147 NI Act." },
      { daysOffset: -5, outcome: "DISPOSED", remarks: "Proceedings compounded upon full payment of settlement demand." },
    ],
  },
  {
    caseNumber: "DCM/2026/0108",
    title: "State of NCT of Delhi vs. Deepak Chauhan",
    caseType: "BAIL",
    targetTrackName: "FAST", // Overridden from STANDARD
    overrideReason: "Statutory default bail application under Section 167(2) CrPC demanding expedited disposal",
    daysAgo: 35,
    isUrgent: true,
    hasExpertEvidence: true, // would normally score 1+2=3 or 4 with parties
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "State of NCT of Delhi", role: "PETITIONER" },
      { name: "Deepak Chauhan", role: "RESPONDENT" },
      { name: "Advocate Rohit Mehta", role: "ADVOCATE" },
    ],
    hearings: [
      { daysOffset: -12, outcome: "HEARD", remarks: "Case diary inspected. Forensic FSL chemical report awaited." },
    ],
  },
  {
    caseNumber: "DCM/2026/0109",
    title: "Reliance Retail Ltd. vs. Sharma Provision Store",
    caseType: "CHEQUE_BOUNCE",
    targetTrackName: "FAST",
    daysAgo: 14,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Reliance Retail Ltd.", role: "PETITIONER" },
      { name: "Sharma Provision Store", role: "RESPONDENT" },
    ],
    hearings: [],
  },
  {
    caseNumber: "DCM/2026/0110",
    title: "Geeta Aggarwal vs. Manoj Kumar",
    caseType: "RENT_DISPUTE",
    targetTrackName: "FAST",
    daysAgo: 75,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "LISTED",
    trackApproved: true,
    parties: [
      { name: "Geeta Aggarwal", role: "PETITIONER" },
      { name: "Manoj Kumar", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: 0, outcome: "SCHEDULED", remarks: "Cross-examination of respondent on lease deed execution." },
    ],
  },
  {
    caseNumber: "DCM/2026/0111",
    title: "State of NCT of Delhi vs. Mohd. Arshad",
    caseType: "BAIL",
    targetTrackName: "FAST",
    daysAgo: 120, // Overdue (> 90d)
    isUrgent: true,
    hasExpertEvidence: false,
    adjournmentCount: 3,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "State of NCT of Delhi", role: "PETITIONER" },
      { name: "Mohd. Arshad", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -60, outcome: "ADJOURNED", remarks: "Investigating Officer failed to appear with TCR." },
      { daysOffset: -35, outcome: "ADJOURNED", remarks: "Public prosecutor requested short adjournment for status report." },
      { daysOffset: -15, outcome: "ADJOURNED", remarks: "Medical examination report from LNJP Hospital awaited." },
    ],
  },
  {
    caseNumber: "DCM/2026/0112",
    title: "Tata Capital Ltd. vs. Apex Engineering Works",
    caseType: "CHEQUE_BOUNCE",
    targetTrackName: "FAST",
    daysAgo: 50,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "DISPOSED",
    disposedDaysAgo: 10,
    trackApproved: true,
    parties: [
      { name: "Tata Capital Financial Services", role: "PETITIONER" },
      { name: "Apex Engineering Works", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -10, outcome: "DISPOSED", remarks: "Cheque bounce complaint dismissed as withdrawn following OTS." },
    ],
  },
  {
    caseNumber: "DCM/2026/0113",
    title: "Suman Lata vs. Prem Chand",
    caseType: "RENT_DISPUTE",
    targetTrackName: "FAST",
    daysAgo: 12,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: false, // Awaiting review
    parties: [
      { name: "Suman Lata", role: "PETITIONER" },
      { name: "Prem Chand", role: "RESPONDENT" },
    ],
    hearings: [],
  },
  {
    caseNumber: "DCM/2026/0114",
    title: "State of NCT of Delhi vs. Rohit Yadav",
    caseType: "BAIL",
    targetTrackName: "FAST",
    daysAgo: 6,
    isUrgent: true,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "LISTED",
    trackApproved: true,
    parties: [
      { name: "State of NCT of Delhi", role: "PETITIONER" },
      { name: "Rohit Yadav", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: 0, outcome: "SCHEDULED", remarks: "Hearing listed for bail application on grounds of parity." },
    ],
  },
  {
    caseNumber: "DCM/2026/0115",
    title: "Bajaj Finance Ltd. vs. Sunil Verma",
    caseType: "CHEQUE_BOUNCE",
    targetTrackName: "FAST",
    daysAgo: 88,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Bajaj Finance Ltd.", role: "PETITIONER" },
      { name: "Sunil Verma", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -30, outcome: "ADJOURNED", remarks: "Notice under Section 251 CrPC served. Plea of not guilty recorded." },
    ],
  },
  {
    caseNumber: "DCM/2026/0116",
    title: "Prem Sagar vs. Subhash Chandra",
    caseType: "RENT_DISPUTE",
    targetTrackName: "FAST",
    daysAgo: 32,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "DISPOSED",
    disposedDaysAgo: 2,
    trackApproved: true,
    parties: [
      { name: "Prem Sagar", role: "PETITIONER" },
      { name: "Subhash Chandra", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -2, outcome: "DISPOSED", remarks: "Mutual compromise agreement filed under Order XXIII Rule 3 CPC." },
    ],
  },

  // STANDARD Track Matters (18 cases: Civil Suits, Contract Breaches, Contested Rent)
  {
    caseNumber: "DCM/2026/0117",
    title: "Radhe Shyam vs. Municipal Corporation of Delhi",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 120,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Radhe Shyam", role: "PETITIONER" },
      { name: "Municipal Corporation of Delhi (MCD)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -45, outcome: "ADJOURNED", remarks: "MCD standing counsel requested time to file written statement." },
    ],
  },
  {
    caseNumber: "DCM/2026/0118",
    title: "Anita Singhal vs. DDA & Anr.",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 210,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Anita Singhal", role: "PETITIONER" },
      { name: "Delhi Development Authority", role: "RESPONDENT" },
      { name: "Union of India (Ministry of Housing)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -70, outcome: "HEARD", remarks: "Framing of issues completed. List of witnesses filed." },
    ],
  },
  {
    caseNumber: "DCM/2026/0119",
    title: "Om Prakash vs. Jagdish Prasad",
    caseType: "RENT_DISPUTE",
    targetTrackName: "STANDARD",
    daysAgo: 380, // Overdue (> 365d)
    isUrgent: false,
    hasExpertEvidence: true, // Expert evidence pushed score to STANDARD
    adjournmentCount: 2,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Om Prakash", role: "PETITIONER" },
      { name: "Jagdish Prasad", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -120, outcome: "ADJOURNED", remarks: "Handwriting expert report on rent receipt awaited." },
      { daysOffset: -40, outcome: "ADJOURNED", remarks: "Witness PW-2 unavailable due to medical emergency." },
    ],
  },
  {
    caseNumber: "DCM/2026/0120",
    title: "Dynamic Logistics Ltd. vs. Skyline Cargo Movers",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 90,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Dynamic Logistics Ltd.", role: "PETITIONER" },
      { name: "Skyline Cargo Movers", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -30, outcome: "HEARD", remarks: "Admission and denial of documents executed by counsels." },
    ],
  },
  {
    caseNumber: "DCM/2026/0121",
    title: "Suresh Gupta vs. Kamlesh Rani",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 310,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 2,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Suresh Gupta", role: "PETITIONER" },
      { name: "Kamlesh Rani", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -100, outcome: "ADJOURNED", remarks: "Parties sought adjournment for joint demarcation." },
      { daysOffset: -35, outcome: "ADJOURNED", remarks: "Local commissioner report awaited." },
    ],
  },
  {
    caseNumber: "DCM/2026/0122",
    title: "Bharti Infratel vs. Northern Telecom Infrastructure",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 420, // Overdue (> 365d)
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 3,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Bharti Infratel Ltd.", role: "PETITIONER" },
      { name: "Northern Telecom Infrastructure Ltd.", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -180, outcome: "ADJOURNED", remarks: "Defendant granted final opportunity to file replication." },
      { daysOffset: -110, outcome: "ADJOURNED", remarks: "Arbitration clause invocation argued under Section 8." },
      { daysOffset: -45, outcome: "ADJOURNED", remarks: "Cost of ₹5,000 imposed on respondent for unexcused delay." },
    ],
  },
  {
    caseNumber: "DCM/2026/0123",
    title: "Vijay Goel vs. New India Assurance Co.",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 60,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: false, // Awaiting review
    parties: [
      { name: "Vijay Goel", role: "PETITIONER" },
      { name: "New India Assurance Co. Ltd.", role: "RESPONDENT" },
    ],
    hearings: [],
  },
  {
    caseNumber: "DCM/2026/0124",
    title: "Maya Devi vs. Satish Kumar",
    caseType: "RENT_DISPUTE",
    targetTrackName: "STANDARD",
    daysAgo: 150,
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 0,
    status: "LISTED",
    trackApproved: true,
    parties: [
      { name: "Maya Devi", role: "PETITIONER" },
      { name: "Satish Kumar", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: 0, outcome: "SCHEDULED", remarks: "Scheduled for recording evidence of petitioner's structural engineer." },
    ],
  },
  {
    caseNumber: "DCM/2026/0125",
    title: "National Small Industries Corp. vs. Pioneer Precision",
    caseType: "CIVIL_SUIT",
    targetTrackName: "COMPLEX", // Overridden from STANDARD to COMPLEX
    overrideReason: "Subject matter valuation exceeds statutory pecuniary threshold and involves 4 consolidated counter-claims",
    daysAgo: 180,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "National Small Industries Corporation (NSIC)", role: "PETITIONER" },
      { name: "Pioneer Precision Instruments Pvt. Ltd.", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -60, outcome: "HEARD", remarks: "Interlocutory injunction application argued and reserved." },
    ],
  },
  {
    caseNumber: "DCM/2026/0126",
    title: "Dr. Ashok Sehgal vs. Max Healthcare Institute",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 75,
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Dr. Ashok Sehgal", role: "PETITIONER" },
      { name: "Max Healthcare Institute Ltd.", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -25, outcome: "HEARD", remarks: "Medical council board report submitted in sealed cover." },
    ],
  },
  {
    caseNumber: "DCM/2026/0127",
    title: "Vinod Kumar vs. Ashok Kumar",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 1950, // Aging (> 5 years) and Overdue
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 4,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Vinod Kumar", role: "PETITIONER" },
      { name: "Ashok Kumar", role: "RESPONDENT" },
      { name: "Advocate Rohit Mehta", role: "ADVOCATE" },
    ],
    hearings: [
      { daysOffset: -300, outcome: "ADJOURNED", remarks: "Matter recalled from archives. Predecessor judge transferred." },
      { daysOffset: -160, outcome: "ADJOURNED", remarks: "Court directed formal reconstruction of missing record pages." },
      { daysOffset: -70, outcome: "ADJOURNED", remarks: "Counsel for defendant requested date due to bar council election." },
      { daysOffset: -25, outcome: "ADJOURNED", remarks: "Cross-examination deferred on joint request." },
    ],
  },
  {
    caseNumber: "DCM/2026/0128",
    title: "G4S Facility Services vs. Metro Mall Developers",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 260,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "DISPOSED",
    disposedDaysAgo: 15,
    trackApproved: true,
    parties: [
      { name: "G4S Facility Services India Pvt. Ltd.", role: "PETITIONER" },
      { name: "Metro Mall Developers Ltd.", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -15, outcome: "DISPOSED", remarks: "Suit decreed under Order XII Rule 6 CPC on admission of debt." },
    ],
  },
  {
    caseNumber: "DCM/2026/0129",
    title: "Sangeeta Jain vs. Delhi Jal Board",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 45,
    isUrgent: true,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Sangeeta Jain", role: "PETITIONER" },
      { name: "Delhi Jal Board (Govt. of NCT)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -15, outcome: "HEARD", remarks: "Interim stay on commercial water disconnection confirmed till final disposal." },
    ],
  },
  {
    caseNumber: "DCM/2026/0130",
    title: "Kailash Chand vs. Rameshwar Dass",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 395, // Overdue (> 365d)
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 2,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Kailash Chand", role: "PETITIONER" },
      { name: "Rameshwar Dass", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -150, outcome: "ADJOURNED", remarks: "Local commissioner appointed for property site inspection." },
      { daysOffset: -50, outcome: "ADJOURNED", remarks: "Objections filed against commissioner report." },
    ],
  },
  {
    caseNumber: "DCM/2026/0131",
    title: "Mohan Singh vs. Baldev Raj",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 110,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: false, // Awaiting review
    parties: [
      { name: "Mohan Singh", role: "PETITIONER" },
      { name: "Baldev Raj", role: "RESPONDENT" },
    ],
    hearings: [],
  },
  {
    caseNumber: "DCM/2026/0132",
    title: "Sterling Tools Pvt. Ltd. vs. Paramount Foundry",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 340,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "LISTED",
    trackApproved: true,
    parties: [
      { name: "Sterling Tools Pvt. Ltd.", role: "PETITIONER" },
      { name: "Paramount Foundry Works", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: 0, outcome: "SCHEDULED", remarks: "Final arguments on recovery of manufacturing dues." },
    ],
  },
  {
    caseNumber: "DCM/2026/0133",
    title: "Usha Rani vs. National Insurance Co. Ltd.",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 190,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "DISPOSED",
    disposedDaysAgo: 20,
    trackApproved: true,
    parties: [
      { name: "Usha Rani", role: "PETITIONER" },
      { name: "National Insurance Co. Ltd.", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -20, outcome: "DISPOSED", remarks: "Claim satisfied through pre-litigation Lok Adalat award." },
    ],
  },
  {
    caseNumber: "DCM/2026/0134",
    title: "Sanjay Mahajan vs. Vikas Housing Welfare Society",
    caseType: "CIVIL_SUIT",
    targetTrackName: "STANDARD",
    daysAgo: 80,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Sanjay Mahajan", role: "PETITIONER" },
      { name: "Vikas Housing Welfare Society", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -30, outcome: "HEARD", remarks: "Pleadings complete. Admission of original bylaws confirmed." },
    ],
  },

  // COMPLEX Track Matters (11 cases: Commercial Disputes, Property Title Partition)
  {
    caseNumber: "DCM/2026/0135",
    title: "DLF Home Developers vs. Town & Country Planning Dept.",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 320,
    isUrgent: true,
    hasExpertEvidence: true,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "DLF Home Developers Ltd.", role: "PETITIONER" },
      { name: "Directorate of Town & Country Planning (Haryana)", role: "RESPONDENT" },
      { name: "State of Haryana", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -120, outcome: "HEARD", remarks: "Zoning master plan documents scrutinized with GIS surveyor." },
      { daysOffset: -40, outcome: "ADJOURNED", remarks: "Expert environmental auditor testimony scheduled." },
    ],
  },
  {
    caseNumber: "DCM/2026/0136",
    title: "Ansal Properties vs. Delhi Development Authority",
    caseType: "PROPERTY_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 540,
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 2,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Ansal Properties & Infrastructure Ltd.", role: "PETITIONER" },
      { name: "Delhi Development Authority", role: "RESPONDENT" },
      { name: "Land Acquisition Collector, South Delhi", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -210, outcome: "ADJOURNED", remarks: "Original land revenue settlement records of 1968 summoned." },
      { daysOffset: -90, outcome: "ADJOURNED", remarks: "Sadar Kanungo directed to produce village aks-shajra map." },
    ],
  },
  {
    caseNumber: "DCM/2026/0137",
    title: "Mehra Brothers Ltd. vs. Shriram EPC Consortium",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 2100, // Aging (> 5 years) and Overdue (> 730d)
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 4,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Mehra Brothers Heavy Engineering Ltd.", role: "PETITIONER" },
      { name: "Shriram EPC Engineering Consortium", role: "RESPONDENT" },
      { name: "Bank of Baroda (Guarantee Trustee)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -380, outcome: "ADJOURNED", remarks: "High Court stay order vacated. Trial reopened before district court." },
      { daysOffset: -240, outcome: "ADJOURNED", remarks: "Forensic chartered accountant audit report contested." },
      { daysOffset: -140, outcome: "ADJOURNED", remarks: "Petitioner witness examination held over due to ill health." },
      { daysOffset: -50, outcome: "ADJOURNED", remarks: "Parties directed to file succinct written arguments within 4 weeks." },
    ],
  },
  {
    caseNumber: "DCM/2026/0138",
    title: "Jindal Steel & Power vs. Central Coalfields Ltd.",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 180,
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Jindal Steel & Power Ltd.", role: "PETITIONER" },
      { name: "Central Coalfields Ltd. (Coal India)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -60, outcome: "HEARD", remarks: "Fuel supply agreement reconciliation statements examined." },
    ],
  },
  {
    caseNumber: "DCM/2026/0139",
    title: "Raghuvir Estate Partition Suit vs. Surender Nath & 5 Ors.",
    caseType: "PROPERTY_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 620,
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 2,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Raghuvir Nath (Co-sharer)", role: "PETITIONER" },
      { name: "Surender Nath", role: "RESPONDENT" },
      { name: "Mahesh Nath", role: "RESPONDENT" },
      { name: "Kamla Devi", role: "RESPONDENT" },
      { name: "Advocate Rohit Mehta", role: "ADVOCATE" },
    ],
    hearings: [
      { daysOffset: -280, outcome: "ADJOURNED", remarks: "Preliminary partition decree passed. Local commissioner appointed." },
      { daysOffset: -90, outcome: "ADJOURNED", remarks: "Modes of partition contested by respondent No. 3." },
    ],
  },
  {
    caseNumber: "DCM/2026/0140",
    title: "Tech Mahindra Ltd. vs. Global e-Solutions Inc.",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 760, // Overdue (> 730d)
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 3,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Tech Mahindra Ltd.", role: "PETITIONER" },
      { name: "Global e-Solutions Inc. (Delaware)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -300, outcome: "ADJOURNED", remarks: "Service of summons through Hague Convention verified." },
      { daysOffset: -180, outcome: "ADJOURNED", remarks: "Cross-border software escrow agreement inspection." },
      { daysOffset: -65, outcome: "ADJOURNED", remarks: "Foreign law expert testimony scheduled." },
    ],
  },
  {
    caseNumber: "DCM/2026/0141",
    title: "Vardhman Polytex vs. National Textile Corporation",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 140,
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 0,
    status: "PENDING",
    trackApproved: false, // Awaiting review
    parties: [
      { name: "Vardhman Polytex Ltd.", role: "PETITIONER" },
      { name: "National Textile Corporation Ltd.", role: "RESPONDENT" },
    ],
    hearings: [],
  },
  {
    caseNumber: "DCM/2026/0142",
    title: "K.K. Modi Family Trust vs. Godfrey Phillips India",
    caseType: "PROPERTY_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 410,
    isUrgent: true,
    hasExpertEvidence: true,
    adjournmentCount: 1,
    status: "LISTED",
    trackApproved: true,
    parties: [
      { name: "K.K. Modi Family Trust", role: "PETITIONER" },
      { name: "Godfrey Phillips India Ltd.", role: "RESPONDENT" },
      { name: "Lalit Modi (Trustee)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: 0, outcome: "SCHEDULED", remarks: "Trust deed interpretation hearing listed before special commercial bench." },
    ],
  },
  {
    caseNumber: "DCM/2026/0143",
    title: "Havells India Ltd. vs. Continental Electricals",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "STANDARD", // Overridden from COMPLEX to STANDARD
    overrideReason: "Parties entered into preliminary settlement framework before High Court mediation bench",
    daysAgo: 290,
    isUrgent: false,
    hasExpertEvidence: false,
    adjournmentCount: 1,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Havells India Ltd.", role: "PETITIONER" },
      { name: "Continental Electricals Pvt. Ltd.", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -80, outcome: "ADJOURNED", remarks: "Joint memo of settlement compliance verification." },
    ],
  },
  {
    caseNumber: "DCM/2026/0144",
    title: "Sharda Educational Trust vs. AICTE & Union of India",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 850, // Overdue (> 730d)
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 3,
    status: "DISPOSED",
    disposedDaysAgo: 30,
    trackApproved: true,
    parties: [
      { name: "Sharda Educational Trust", role: "PETITIONER" },
      { name: "All India Council for Technical Education", role: "RESPONDENT" },
      { name: "Union of India (Ministry of Education)", role: "RESPONDENT" },
    ],
    hearings: [
      { daysOffset: -30, outcome: "DISPOSED", remarks: "Suit disposed pursuant to revised compliance notification." },
    ],
  },
  {
    caseNumber: "DCM/2026/0145",
    title: "Jagatjit Industries vs. United Spirits Consortium",
    caseType: "COMMERCIAL_DISPUTE",
    targetTrackName: "COMPLEX",
    daysAgo: 2050, // Aging (> 5 years) and Overdue (> 730d)
    isUrgent: false,
    hasExpertEvidence: true,
    adjournmentCount: 4,
    status: "PENDING",
    trackApproved: true,
    parties: [
      { name: "Jagatjit Industries Ltd.", role: "PETITIONER" },
      { name: "United Spirits Ltd.", role: "RESPONDENT" },
      { name: "Diageo India Pvt. Ltd.", role: "RESPONDENT" },
      { name: "Advocate Rohit Mehta", role: "ADVOCATE" },
    ],
    hearings: [
      { daysOffset: -400, outcome: "ADJOURNED", remarks: "Trademark license agreement forensic verification." },
      { daysOffset: -210, outcome: "ADJOURNED", remarks: "Valuation of international distribution rights contested." },
      { daysOffset: -110, outcome: "ADJOURNED", remarks: "Senior counsel on legs before Supreme Court constitutional bench." },
      { daysOffset: -40, outcome: "ADJOURNED", remarks: "Re-examination of chartered accountants board." },
    ],
  },
];

async function runSeed() {
  console.log(`\n============================================================`);
  console.log(`  NyayaKram — District Court Realistic Demo Data Generator  `);
  console.log(`  Mode: ${isDryRun ? "DRY-RUN (In-Memory Simulation)" : "LIVE DATABASE WRITE"}  `);
  console.log(`============================================================\n`);

  const today = todayIST();

  // 1. Fetch prerequisite Tracks from database (or simulate if dry-run without DB)
  let tracks = [];
  let judges = [];
  let clerk = null;

  try {
    tracks = await defaultPrisma.track.findMany();
    judges = await defaultPrisma.judge.findMany({
      include: { user: true },
    });
    clerk = await defaultPrisma.user.findFirst({
      where: { role: "CLERK" },
    });
  } catch (err) {
    if (!isDryRun) {
      throw err;
    }
  }

  // Fallback defaults for dry run if DB was unreachable or empty
  if (tracks.length === 0) {
    tracks = [
      { id: "mock-fast", name: "FAST", targetDays: 90, gapDays: 7 },
      { id: "mock-std", name: "STANDARD", targetDays: 365, gapDays: 21 },
      { id: "mock-cpx", name: "COMPLEX", targetDays: 730, gapDays: 45 },
    ];
  }

  if (judges.length === 0) {
    judges = [
      { id: "mock-j1", courtroom: "Courtroom 101", dailyCapacity: 10, user: { id: "u-j1", name: "Justice Shalini Saxena" } },
      { id: "mock-j2", courtroom: "Courtroom 102", dailyCapacity: 8, user: { id: "u-j2", name: "Justice Rajesh Kumar" } },
      { id: "mock-j3", courtroom: "Courtroom 103", dailyCapacity: 12, user: { id: "u-j3", name: "Justice Priya Nair" } },
    ];
  }

  const trackByName = {};
  for (const t of tracks) {
    trackByName[t.name] = t;
  }

  // 2. Process all 45 demo cases with full domain rules
  const reconciliation = {
    total: DEMO_CASES.length,
    byTrack: { FAST: 0, STANDARD: 0, COMPLEX: 0 },
    byStatus: { PENDING: 0, LISTED: 0, DISPOSED: 0 },
    urgentCount: 0,
    overdueCount: 0,
    agingCount: 0,
    awaitingReviewCount: 0,
    overrideCount: 0,
    totalHearings: 0,
    hearingsToday: 0,
    courtroomLoad: {},
  };

  for (const j of judges) {
    reconciliation.courtroomLoad[j.courtroom] = {
      cases: 0,
      complexitySum: 0,
      judgeName: j.user?.name || "Judge",
    };
  }

  const processedCases = [];

  for (let i = 0; i < DEMO_CASES.length; i++) {
    const raw = DEMO_CASES[i];

    // Compute complexity via official service rule
    const partyCount = raw.parties.length;
    const complexity = calculateComplexity(raw.caseType, partyCount, raw.hasExpertEvidence);

    // Active track vs Suggested track
    const activeTrack = trackByName[raw.targetTrackName] || trackByName["STANDARD"];
    let suggestedTrackName = "FAST";
    if (complexity >= 7) suggestedTrackName = "COMPLEX";
    else if (complexity >= 4) suggestedTrackName = "STANDARD";
    const suggestedTrack = trackByName[suggestedTrackName] || activeTrack;

    // Dates calculation via dates.js
    const filingDate = addDays(today, -raw.daysAgo);
    const targetDisposalDate = addDays(filingDate, activeTrack.targetDays);
    const ageInDays = Math.max(0, daysBetween(filingDate, today));

    // Priority score via pure mathematical model
    const priorityScore = calculatePriorityScore({
      filingDate,
      targetDays: activeTrack.targetDays,
      isUrgent: raw.isUrgent,
      adjournmentCount: raw.adjournmentCount,
      asOfDate: today,
    });

    const isOverdue = isCaseOverdue(targetDisposalDate, raw.status, today);
    const isAging = isCaseAging(filingDate, raw.status, today);

    // Round-robin balanced judge assignment across courtrooms
    const assignedJudge = judges[i % judges.length];

    // Earliest next hearing date calculation
    let lastHearingOffset = null;
    let scheduledToday = false;

    if (raw.hearings.length > 0) {
      for (const h of raw.hearings) {
        if (h.daysOffset === 0) scheduledToday = true;
        if (lastHearingOffset === null || h.daysOffset > lastHearingOffset) {
          lastHearingOffset = h.daysOffset;
        }
      }
    }

    const earliestNextDate = lastHearingOffset !== null
      ? addDays(addDays(today, lastHearingOffset), activeTrack.gapDays)
      : filingDate;

    const disposedDate = raw.disposedDaysAgo
      ? addDays(today, -raw.disposedDaysAgo)
      : null;

    // Track reconciliation statistics
    reconciliation.byTrack[activeTrack.name] = (reconciliation.byTrack[activeTrack.name] || 0) + 1;
    reconciliation.byStatus[raw.status] = (reconciliation.byStatus[raw.status] || 0) + 1;
    if (raw.isUrgent) reconciliation.urgentCount++;
    if (isOverdue) reconciliation.overdueCount++;
    if (isAging) reconciliation.agingCount++;
    if (!raw.trackApproved) reconciliation.awaitingReviewCount++;
    if (raw.overrideReason) reconciliation.overrideCount++;
    reconciliation.totalHearings += raw.hearings.length;
    if (scheduledToday) reconciliation.hearingsToday++;

    if (reconciliation.courtroomLoad[assignedJudge.courtroom]) {
      reconciliation.courtroomLoad[assignedJudge.courtroom].cases++;
      reconciliation.courtroomLoad[assignedJudge.courtroom].complexitySum += complexity;
    }

    processedCases.push({
      caseNumber: raw.caseNumber,
      title: raw.title,
      caseType: raw.caseType,
      filingDate,
      targetDisposalDate,
      earliestNextDate,
      disposedDate,
      complexity,
      priorityScore,
      isUrgent: raw.isUrgent,
      hasExpertEvidence: raw.hasExpertEvidence,
      adjournmentCount: raw.adjournmentCount,
      status: raw.status,
      trackId: activeTrack.id,
      suggestedTrackId: suggestedTrack.id,
      trackApproved: raw.trackApproved,
      trackApprovedById: raw.trackApproved ? assignedJudge.user?.id : null,
      trackOverrideReason: raw.overrideReason || null,
      judgeId: assignedJudge.id,
      parties: raw.parties,
      hearings: raw.hearings,
      isOverdue,
      isAging,
      courtroom: assignedJudge.courtroom,
    });
  }

  // 3. Perform Live Database Upserts (if NOT dry-run)
  if (!isDryRun) {
    console.log(`Writing 45 cases into database...`);

    for (const c of processedCases) {
      const courtCase = await defaultPrisma.case.upsert({
        where: { caseNumber: c.caseNumber },
        update: {
          title: c.title,
          caseType: c.caseType,
          filingDate: toDateOnly(c.filingDate),
          hasExpertEvidence: c.hasExpertEvidence,
          isUrgent: c.isUrgent,
          complexity: c.complexity,
          suggestedTrackId: c.suggestedTrackId,
          trackId: c.trackId,
          trackApproved: c.trackApproved,
          trackApprovedById: c.trackApprovedById,
          trackOverrideReason: c.trackOverrideReason,
          status: c.status,
          priorityScore: c.priorityScore,
          targetDisposalDate: toDateOnly(c.targetDisposalDate),
          earliestNextDate: toDateOnly(c.earliestNextDate),
          adjournmentCount: c.adjournmentCount,
          disposedDate: c.disposedDate ? toDateOnly(c.disposedDate) : null,
          judgeId: c.judgeId,
        },
        create: {
          caseNumber: c.caseNumber,
          title: c.title,
          caseType: c.caseType,
          filingDate: toDateOnly(c.filingDate),
          hasExpertEvidence: c.hasExpertEvidence,
          isUrgent: c.isUrgent,
          complexity: c.complexity,
          suggestedTrackId: c.suggestedTrackId,
          trackId: c.trackId,
          trackApproved: c.trackApproved,
          trackApprovedById: c.trackApprovedById,
          trackOverrideReason: c.trackOverrideReason,
          status: c.status,
          priorityScore: c.priorityScore,
          targetDisposalDate: toDateOnly(c.targetDisposalDate),
          earliestNextDate: toDateOnly(c.earliestNextDate),
          adjournmentCount: c.adjournmentCount,
          disposedDate: c.disposedDate ? toDateOnly(c.disposedDate) : null,
          judgeId: c.judgeId,
        },
      });

      // Upsert Parties
      for (const p of c.parties) {
        const existingParty = await defaultPrisma.party.findFirst({
          where: { caseId: courtCase.id, name: p.name, role: p.role },
        });
        if (!existingParty) {
          await defaultPrisma.party.create({
            data: {
              caseId: courtCase.id,
              name: p.name,
              role: p.role,
            },
          });
        }
      }

      // Upsert Hearings
      for (const h of c.hearings) {
        const hDate = addDays(today, h.daysOffset);
        const existingHearing = await defaultPrisma.hearing.findFirst({
          where: {
            caseId: courtCase.id,
            hearingDate: toDateOnly(hDate),
          },
        });

        if (!existingHearing) {
          await defaultPrisma.hearing.create({
            data: {
              caseId: courtCase.id,
              judgeId: c.judgeId,
              hearingDate: toDateOnly(hDate),
              outcome: h.outcome,
              remarks: h.remarks,
            },
          });
        }
      }

      // Audit Log on registration
      const existingLog = await defaultPrisma.auditLog.findFirst({
        where: { caseId: courtCase.id, action: "CASE_REGISTERED" },
      });
      if (!existingLog && clerk) {
        await defaultPrisma.auditLog.create({
          data: {
            userId: clerk.id,
            caseId: courtCase.id,
            action: "CASE_REGISTERED",
            details: JSON.stringify({
              caseNumber: c.caseNumber,
              track: c.targetTrackName,
              complexity: c.complexity,
              priorityScore: c.priorityScore,
            }),
          },
        });
      }
    }
  }

  // 4. Print Reconciliation Summary Table
  console.log(`\n============================================================`);
  console.log(`               RECONCILIATION & AUDIT SUMMARY               `);
  console.log(`============================================================`);
  console.log(`Total Cases:              ${reconciliation.total}`);
  console.log(`Track Distribution:       FAST: ${reconciliation.byTrack.FAST} | STANDARD: ${reconciliation.byTrack.STANDARD} | COMPLEX: ${reconciliation.byTrack.COMPLEX}`);
  console.log(`Status Distribution:      PENDING: ${reconciliation.byStatus.PENDING} | LISTED: ${reconciliation.byStatus.LISTED} | DISPOSED: ${reconciliation.byStatus.DISPOSED}`);
  console.log(`Urgent Priority Matters:  ${reconciliation.urgentCount} (+30 priority bump applied)`);
  console.log(`Overdue Track Flags:      ${reconciliation.overdueCount} (past target disposal deadline)`);
  console.log(`Aging Matters (>5 yrs):   ${reconciliation.agingCount} (historical district backlog)`);
  console.log(`Track Approvals:          Approved: ${reconciliation.total - reconciliation.awaitingReviewCount - reconciliation.overrideCount} | Awaiting Review: ${reconciliation.awaitingReviewCount} | Overridden: ${reconciliation.overrideCount}`);
  console.log(`Hearing Proceedings:      Total: ${reconciliation.totalHearings} | Scheduled Today: ${reconciliation.hearingsToday}`);
  console.log(`------------------------------------------------------------`);
  console.log(`Courtroom Workload Allocation (Greedy Balancing):`);
  for (const [room, data] of Object.entries(reconciliation.courtroomLoad)) {
    console.log(`  - ${room.padEnd(16)}: ${String(data.cases).padStart(2)} cases | ${String(data.complexitySum).padStart(3)} complexity pts | ${data.judgeName}`);
  }
  console.log(`============================================================`);
  console.log(isDryRun ? `[DRY-RUN COMPLETE] No database mutations occurred.\n` : `[LIVE SEED COMPLETE] 45 cases successfully seeded into database.\n`);
}

runSeed()
  .catch((err) => {
    console.error("❌ Seed script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await defaultPrisma.$disconnect();
  });

