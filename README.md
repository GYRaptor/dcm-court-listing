# Differentiated Case Flow Management (DCM) System

> Streamlining court case scheduling and listing for the Indian Judiciary (Ministry of Law and Justice Problem Statement 147).

---

## 🎯 The Problem
Traditional court registries list matters primarily in chronological filing order, ignoring the vast differences in procedural complexity and estimated hearing times. This leads to:
- Simple cases (e.g., bail, cheque bounce) getting trapped behind multi-volume title disputes.
- Unpredictable cause lists resulting in frequent adjournments.
- Growing case backlogs with no track-based target disposal timelines.

## 💡 The Solution
A **Differentiated Case Flow Management (DCM) System** that:
1. **Classifies** cases into three tracks (**FAST** / **STANDARD** / **COMPLEX**) based on objective complexity scoring (case type, party count, expert evidence).
2. Sets strict **target disposal timelines** (upper limit of 2 years).
3. **Prioritizes** matters using a fair priority score factoring elapsed allowed time, urgency, and past adjournments.
4. Generates optimized daily **cause lists** matching each judge's hearing capacity without duplicates.

---

## 🛠️ Tech Stack
- **Frontend**: React (Vite), React Router, Tailwind CSS, Recharts, plain `fetch` wrapper in `client/src/api.js`.
- **Backend**: Node.js, Express (ES Modules), Prisma ORM, PostgreSQL (Neon), bcrypt, jsonwebtoken, Zod, cors, dotenv.
- **Deployment**: Vercel (Client), Render (Server), Neon (Cloud PostgreSQL).

---

## 👥 Demo Credentials (Demo Only)
All seeded demo accounts share the password: `Demo@1234`
- **Court Clerk**: `clerk@court.gov.in`
- **Judge 1 (Courtroom 101)**: `judge.saxena@court.gov.in`
- **Judge 2 (Courtroom 102)**: `judge.kumar@court.gov.in`
- **Judge 3 (Courtroom 103)**: `judge.nair@court.gov.in`
- **Advocate / Lawyer**: `rohit.lawyer@court.gov.in`

---

## 📁 Project Structure
```text
.
├── client/          # Vite + React frontend
├── server/          # Express + Prisma backend
├── docs/            # Viva preparation notes & technical documentation
└── README.md
```

