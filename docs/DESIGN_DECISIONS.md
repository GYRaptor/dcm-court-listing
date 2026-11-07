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

## 4. Priority Score Formula
Cause list scheduling sorts eligible cases by priority in descending order:

$$\text{Priority Score} = \left(\frac{\text{Age in Days}}{\text{Track Target Days}} \times 100\right) + (\text{isUrgent} \ ? \ 30 : 0) + (\text{Adjournment Count} \times 5)$$

- **Share of Allowed Time Used**: $\left(\frac{\text{Age in Days}}{\text{Target Days}} \times 100\right)$ normalizes urgency across tracks. A 60-day-old FAST case (target 90d) has consumed 66.7% of its target, whereas a 60-day-old COMPLEX case (target 730d) has only consumed 8.2%. The FAST case rightfully receives higher listing priority.
- **Urgency Bump**: $+30$ points if `isUrgent` is flagged by the registry.
- **Adjournment Escalation**: $+5$ points for each past adjournment to prevent chronic postponement.
- **Output**: Rounded to 1 decimal place.

---

## 5. Audit Logging Architecture
Court management software demands strict compliance and evidentiary auditability. The `AuditLog` model captures:
- `userId`: Identity of the clerk or judge initiating the action.
- `action`: Specific standardized events (`CASE_REGISTERED`, `TRACK_APPROVED`, `TRACK_OVERRIDDEN`, `HEARING_SCHEDULED`, `OUTCOME_RECORDED`).
- `caseId`: Associated case identifier (retained with `ON DELETE SET NULL` if a case record is ever expunged).
- `details`: JSON text containing before/after states, override reasons, or listing parameters.
- `createdAt`: ISO timestamp.

Judges have exclusive access to review the registry audit trail (`GET /audit-log`).

---

## 6. Date Handling: Calendar Dates & Timezones (IST vs UTC)
Court scheduling operates on discrete **calendar dates** (e.g., "Hearing on November 10, 2026"), not point-in-time timestamps.
- **Storage**: Dates (`filingDate`, `targetDisposalDate`, `earliestNextDate`, `hearingDate`) are stored in PostgreSQL as ISO 8601 timestamps normalized to midnight UTC (`YYYY-MM-DDT00:00:00.000Z`).
- **Date Arithmetic**: Calculations for target dates (`filingDate + targetDays`) and hearing intervals (`hearingDate + gapDays`) use day-based integer arithmetic (`addDays`), avoiding clock-drift or daylight-saving anomalies.
- **Display**: The React frontend parses UTC midnight timestamps and formats them in Indian Standard Time (IST / `en-IN`), displaying calendar dates consistently across client devices.

---

## 7. Project Assumptions
Because Ministry of Law and Justice Problem Statement 147 defines the broad objective without prescribing micro-level administrative parameters, the following explicit assumptions are established:
1. **Configurable Track Parameters**: Target disposal days (90, 365, 730) and gap days (7, 21, 45) are configured in the `Track` database table, allowing judicial administrative committees to adjust policies without code changes.
2. **Two-Year Ceiling**: All tracks are bounded by the statutory 730-day upper limit.
3. **Aging Definition**: A case is flagged as **Aging** if it remains undisposed after 5 years from its filing date. This is an informational registry flag and does not create a fourth track.
4. **Overdue Definition**: A case is flagged as **Overdue** if its current status is not `DISPOSED` and today's date exceeds `targetDisposalDate`.
5. **Judge Allocation**: Unassigned new cases are automatically assigned to the judge on the bench currently holding the fewest active `PENDING` cases (load-balancing heuristic).

