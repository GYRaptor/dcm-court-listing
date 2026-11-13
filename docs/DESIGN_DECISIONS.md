# Architecture & Design Decisions
## Differentiated Case Flow Management (DCFM) System
*Ministry of Law and Justice Problem Statement 147*

This document provides a concise, plain-language record of technical and procedural design decisions in the DCFM court listing system. It is updated at the conclusion of each development milestone.

---

## 1. Differentiated Case Flow Management (DCFM) & Track Rules
Traditional court listing operates predominantly on a First-In-First-Out (FIFO) chronological sequence. This fails to account for significant variance in case complexity and duration, causing simple urgent matters (e.g., bail applications) to be obstructed behind multi-volume title suits.

The DCFM architecture categorizes all incoming matters into three distinct tracks:
- **FAST Track**:
  - *Target Disposal*: 90 calendar days.
  - *Adjournment Cooling Gap*: 7 days minimum between consecutive hearings.
  - *Case Types*: Bail applications, cheque bounce (Section 138 NI Act) with minimal evidence.
- **STANDARD Track**:
  - *Target Disposal*: 365 calendar days (1 year).
  - *Adjournment Cooling Gap*: 21 days minimum between consecutive hearings.
  - *Case Types*: Rent disputes, civil suits, standard contract disagreements.
- **COMPLEX Track**:
  - *Target Disposal*: 730 calendar days (2 years — the maximum statutory upper bound).
  - *Adjournment Cooling Gap*: 45 days minimum between consecutive hearings.
  - *Case Types*: Commercial disputes, complex property title suits, multi-party actions requiring extensive expert testimony.

---

## 2. Complexity Scoring Formula
To eliminate arbitrary categorization, track assignment begins with an objective algorithmic complexity score:

$$\text{Complexity Score} = \text{Base Points} + \text{Party Penalty} + \text{Evidence Penalty}$$

1. **Base Points by Case Type**:
   - `BAIL`: 1 point
   - `CHEQUE_BOUNCE`: 2 points
   - `RENT_DISPUTE`: 3 points
   - `CIVIL_SUIT`: 5 points
   - `COMMERCIAL_DISPUTE`: 6 points
   - `PROPERTY_DISPUTE`: 7 points
2. **Party Penalty**: $+1$ point if total parties (petitioners + respondents) exceeds 2.
3. **Evidence Penalty**: $+2$ points if `hasExpertEvidence` is true (forensics, handwriting, valuation, medical reports).

### Track Thresholds
- **Score 1 to 3**: `FAST` Track.
- **Score 4 to 6**: `STANDARD` Track.
- **Score 7 and above**: `COMPLEX` Track.

---

## 3. Human-in-the-Loop: Suggest-Then-Approve Principle
Technology must assist judicial discretion, not replace it. Algorithms cannot foresee procedural nuances, public interest, or consolidated appeals.

- **On Case Registration**: The algorithm automatically computes the complexity score and sets both `suggestedTrackId` and `trackId` to the recommended track. However, `trackApproved` remains `false`.
- **Judicial Approval**: Only a Judicial Officer (`JUDGE`) has authority to:
  1. **Approve Track**: Marks `trackApproved = true` and records `trackApprovedById`.
  2. **Override Track**: Reclassifies the case to a different track (e.g., from STANDARD to FAST or COMPLEX). Overriding strictly requires a documented rationale (`trackOverrideReason`). Upon override, `targetDisposalDate` is recomputed based on the new track's `targetDays`, priority score is refreshed, and `trackApproved` becomes `true`.
- **Auditability**: Every approval and override event writes an immutable entry into the `AuditLog` table.

---

## 4. Priority Score Formula & Adjournment Ceiling
Cause list scheduling sorts eligible cases by priority in descending order:

$$\text{Priority Score} = \left(\frac{\text{Age in Days}}{\text{Track Target Days}} \times 100\right) + (\text{isUrgent} \ ? \ 30 : 0) + \min(5 \times \text{Adjournment Count}, 25)$$

- **Share of Allowed Time Used**: $\left(\frac{\text{Age in Days}}{\text{Target Days}} \times 100\right)$ normalizes urgency across tracks. A 60-day-old FAST case (target 90d) has consumed 66.7% of its target, whereas a 60-day-old COMPLEX case (target 730d) has only consumed 8.2%. The FAST case rightfully receives higher listing priority.
- **Urgency Bump**: $+30$ points if `isUrgent` is flagged by the registry.
- **Adjournment Escalation with Ceiling**: $+5$ points for each past adjournment to prevent chronic postponement, capped strictly at $25$ points (`Math.min(5 * adjournmentCount, 25)`). Capping prevents chronic, heavily adjourned legacy disputes from permanently monopolizing the top of the daily cause list over newer, time-critical matters.
- **Output**: Rounded strictly to 1 decimal place.

---

## 5. Greedy Judge Workload Assignment
Courtrooms should maintain balanced workloads so that no single judge is overwhelmed while others have light dockets.

- **Why Simple Case Counts Fail**: A simple count heuristic treats a 1-point summary bail hearing identically to a 7-point multi-party property dispute. Assigning three complex trials to Judge A and three bail hearings to Judge B produces an appearance of equal distribution (3 cases each), but Judge A carries 21 complexity points while Judge B carries only 3.
- **Greedy Total Complexity Minimization**: When a new case is registered, the assignment algorithm retrieves all active judges and calculates their current active load:

$$\text{Workload}(J) = \sum_{c \in \text{Cases}(J), \ \text{status} \in \{\text{PENDING}, \ \text{LISTED}\}} \text{complexity}(c)$$

- **Assignment**: The new case is assigned to the judge with $\min(\text{Workload}(J))$. Ties are broken deterministically by judicial ID or capacity.
- **Dynamic Workload Metric**: Once a case transitions to `DISPOSED`, its complexity is removed from the judge's active workload, freeing capacity for subsequent assignments.

---

## 6. Audit Logging Architecture
Court management software demands strict compliance and evidentiary auditability. The `AuditLog` model captures:
- `userId`: Identity of the clerk or judge initiating the action.
- `action`: Specific standardized events (`CASE_REGISTERED`, `TRACK_APPROVED`, `TRACK_OVERRIDDEN`, `HEARING_SCHEDULED`, `OUTCOME_RECORDED`).
- `caseId`: Associated case identifier (retained with `ON DELETE SET NULL` if a case record is ever expunged).
- `details`: JSON text containing before/after states, override reasons, or listing parameters.
- `createdAt`: ISO timestamp.

Judges have exclusive access to review the registry audit trail (`GET /audit-log`).

---

## 7. Date Handling: Calendar Dates & Timezones (IST vs UTC)
Court scheduling operates on discrete **calendar dates** (e.g., "Hearing on November 10, 2026"), not point-in-time timestamps.
- **Storage**: Dates (`filingDate`, `targetDisposalDate`, `earliestNextDate`, `hearingDate`, `disposedDate`) are stored in PostgreSQL using native `@db.Date` types. This prevents hour/minute fields from corrupting date identity.
- **Date Arithmetic**: The custom `server/src/utils/dates.js` module calculates target dates (`filingDate + targetDays`), aging, and hearing intervals (`hearingDate + gapDays`) using discrete day math (`addDays`, `daysBetween`) based on `todayIST()` (Asia/Kolkata timezone). This guarantees identical calendar day evaluations regardless of whether server compute runs in UTC or locally in IST.
- **Display**: Pure `YYYY-MM-DD` strings are rendered cleanly without timezone shifts across all client devices.

---

## 8. Lawyer & Public Case Lookup
Advocates and litigants need real-time visibility into their case progress, track assignment, and next hearing date without accessing confidential judicial actions or administrative queues.
- **Wildcard Route**: Because case numbers contain slashes (e.g., `DCM/2026/0001`), standard Express `:caseNumber` parameters truncate at the first slash. The backend uses `GET /cases/lookup/:caseNumber(*)` to capture the full case number.
- **Information Boundary**: The lookup endpoint returns only public docket information: case number, title, type, status, filing date, assigned track, priority score, target disposal date, earliest next date, and assigned judge courtroom. Internal administrative notes and audit entries are excluded.

---

## 9. Project Assumptions
Because Ministry of Law and Justice Problem Statement 147 defines the broad objective without prescribing micro-level administrative parameters, the following explicit assumptions are established:
1. **Configurable Track Parameters**: Target disposal days (90, 365, 730) and gap days (7, 21, 45) are configured in the `Track` database table, allowing judicial administrative committees to adjust policies without code changes.
2. **Two-Year Ceiling**: All tracks are bounded by the statutory 730-day upper limit.
3. **Aging Definition**: A case is flagged as **Aging** if it remains undisposed after 5 years from its filing date. This is an informational registry flag and does not create a fourth track.
4. **Overdue Definition**: A case is flagged as **Overdue** if its current status is not `DISPOSED` and today's date exceeds `targetDisposalDate`.
5. **Greedy Workload Allocation**: Unassigned new cases are automatically assigned to the judge with the lowest cumulative complexity across active (`PENDING` and `LISTED`) cases.

---

## 10. Institutional Interface & Design System (NyayaKram)
Court management portals serve judicial officers, court clerks, and practicing advocates who interact with dense, consequential legal dockets. The interface intentionally abandons generic SaaS dashboard conventions (floating glass cards, saturated gradients, arbitrary emojis, and status filler) in favor of a restrained, paper-and-ink editorial system.

### A. Typographic Hierarchy
1. **Source Serif 4 (Judicial Headings)**:
   - Used for page headers, card titles, and institutional branding (`NyayaKram`).
   - Reflects the authority, solemnity, and typographical tradition of gazettes, law reports, and official registry documentation.
2. **IBM Plex Sans (Body & Form Ergonomics)**:
   - Engineered for clarity in dense administrative interfaces.
   - Provides neutral legibility for case titles, party names, form labels, and operational buttons.
3. **IBM Plex Mono (Tabular Numerals & Identifiers)**:
   - Applied with `.tabular-nums` across all case numbers (`DCM/YYYY/XXXX`), priority scores, calendar dates, elapsed days, and audit timestamps.
   - Fixed digit widths guarantee vertical alignment in numeric columns, enabling clerks and judges to scan and compare figures without visual jitter.

### B. Paper & Ink Material Palette
- **Paper Canvas (`#F6F3EC`)**: A calm, natural parchment base that eliminates harsh screen glare during long court sessions.
- **Surface Elevation (`#FDFCF9`) & Hairline Rules (`#DAD5C8`)**: Replaces heavy drop shadows with crisp, 1px ruled lines reminiscent of ledger borders and judicial registers. Double rules (`.rule-double`) establish distinct institutional dividers.
- **Deep Ink (`#1C2230`) & Muted (`#5C6470`)**: High-contrast, publication-grade typography adhering strictly to WCAG AA contrast standards.
- **Restrained Signal Colors**:
  - *Ink Navy (`#1F3A5F`)*: Primary institutional action buttons, active navigation markers, and track classification tiers.
  - *Signal Oxblood (`#8A2E35`)*: Overdue matters and disposal actions.
  - *Ochre (`#9A6B1F`)*: Pending reviews, cooling gap notices, and aging matters (>5 years).

### C. Information Density & Human-Centered Registry Ergonomics
- **Dense, Ruled Tables**: Tables use compact row heights (`py-2.5 px-3.5`) and hairline borders (`divide-y divide-rule`), allowing clerks to inspect dozens of cases without paging.
- **Removal of Decorative Noise**: Stripped all emojis, decorative chips, "System Online" fillers, and welcome banners. All states are communicated through concise, professional terminology and quiet status indicators.
- **Aggregated Courtroom Analytics**: Replaced disparate charts with single-row figure strips and aggregated horizontal workload bars, presenting clean complexity distribution per courtroom.


