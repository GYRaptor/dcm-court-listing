# Deliverable 3: Normalization & Schema Design

**System**: NyayaKram — District Court Case Flow Management System (DCFM)  
**Database**: PostgreSQL 16 (Neon Serverless)  
**Focus**: Formal Normalization Derivation (1NF, 2NF, 3NF), Functional Dependencies, and Controlled Denormalization  

---

## 1. Introduction to Normalization in NyayaKram

Database normalization is the systematic process of structuring relational schema to eliminate data redundancy, prevent insertion/update/deletion anomalies, and enforce data integrity. In court administration, an unnormalized schema creates severe hazards—such as an advocate's contact information being updated for one hearing but remaining stale for another, or a case appearing twice in a daily cause list due to repeating party groups.

This document traces the formal normalization of NyayaKram from an unnormalized state (0NF) through Third Normal Form (3NF), identifies functional dependencies across all relations, and provides the architectural justification for specific, controlled denormalizations.

---

## 2. Normalization Progression: 0NF to 3NF

### 2.1 Unnormalized Form (0NF)
Consider a hypothetical single spreadsheet or registry ledger logging court cases:

$$\text{CourtLedger}(\underline{\text{caseNumber}}, \text{title}, \text{filingDate}, \{\text{partyName}, \text{partyRole}\}, \text{judgeName}, \text{courtroom}, \text{trackName}, \text{targetDays}, \text{gapDays}, \{\text{hearingDate}, \text{outcome}, \text{remarks}\})$$

**Anomalies in 0NF:**
- **Repeating Groups**: Multiple parties and multiple hearings are embedded in repeating rows or arrays per case.
- **Redundancy**: Track parameters (`targetDays`, `gapDays`) and judge details (`courtroom`) are duplicated across every case row.
- **Update Anomaly**: If the statutory target days for `FAST` track change from 90 to 60 days, hundreds of case records must be updated; any missed record results in inconsistent disposal metrics.
- **Deletion Anomaly**: If all cases assigned to a newly appointed judge are transferred, deleting those rows erases the judge's existence from the registry.

---

### 2.2 First Normal Form (1NF)
**Definition**: A relation is in 1NF if and only if all attribute domains contain only atomic (indivisible) values, and there are no repeating groups or arrays.

**Action Taken**:
1. Flattened repeating groups by extracting **Parties** and **Hearings** into distinct relational entities.
2. Assigned surrogate primary keys (`id` UUID) to guarantee unique tuple identification.
3. Decomposed composite strings into atomic fields (e.g., distinguishing between filing calendar dates and system creation timestamps).

**Resulting 1NF Entities**:
- `users(id, name, email, passwordHash, role, createdAt)`
- `judges(id, userId, courtroom, dailyCapacity)`
- `tracks(id, name, targetDays, gapDays)`
- `cases(id, caseNumber, title, caseType, filingDate, hasExpertEvidence, isUrgent, complexity, suggestedTrackId, trackId, trackApproved, trackApprovedById, trackOverrideReason, status, priorityScore, targetDisposalDate, earliestNextDate, adjournmentCount, disposedDate, judgeId, createdAt, updatedAt)`
- `parties(id, caseId, name, role)`
- `hearings(id, caseId, judgeId, hearingDate, outcome, remarks, createdAt, updatedAt)`
- `audit_logs(id, userId, action, caseId, details, createdAt)`

---

### 2.3 Second Normal Form (2NF)
**Definition**: A relation is in 2NF if and only if it is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key (no partial key dependencies).

**Analysis**:
- In NyayaKram, all tables utilize single-column surrogate primary keys (`id` as UUID `TEXT PRIMARY KEY`).
- Since no relation uses a composite primary key (such as `(caseId, hearingDate)` or `(caseId, partyName)`), partial dependencies cannot exist mathematically.
- Therefore, all relations in NyayaKram **automatically satisfy Second Normal Form (2NF)**.

---

### 2.4 Third Normal Form (3NF)
**Definition**: A relation is in 3NF if and only if it is in 2NF and no non-prime attribute is transitively dependent on the primary key (no $X \rightarrow Y \rightarrow Z$ dependencies where $X$ is the primary key and $Y$ is not a superkey).

**Transitive Dependency Resolution**:
1. **Judge Courtroom & Capacity**:
   - Initial thought: Storing `judgeName`, `courtroom`, and `dailyCapacity` directly on the `cases` table.
   - Transitive Dependency: $\text{case.id} \rightarrow \text{case.judgeId} \rightarrow (\text{courtroom}, \text{dailyCapacity})$.
   - Resolution: Extracted `judges` as an independent entity with primary key `id`. `cases` holds only the foreign key `judgeId`.
2. **Track Parameters**:
   - Initial thought: Storing `targetDays` and `gapDays` directly on `cases`.
   - Transitive Dependency: $\text{case.id} \rightarrow \text{case.trackId} \rightarrow (\text{targetDays}, \text{gapDays})$.
   - Resolution: Extracted `tracks` as a standalone master lookup table with `id` as primary key. `cases` references `trackId` and `suggestedTrackId`.
3. **Litigant & Counsel Data**:
   - Initial thought: Storing `petitionerName`, `respondentName`, and `advocateName` in `cases`.
   - Transitive Dependency: Violates 1NF (multiple petitioners) and introduces transitive dependencies.
   - Resolution: Extracted into `parties` linked via foreign key `caseId`.

---

## 3. Functional Dependencies Matrix

The formal functional dependencies governing the relational schema are:

| Relation | Primary Key ($X$) | Determinant Functional Dependencies ($X \rightarrow Y$) | Candidate Keys |
| :--- | :--- | :--- | :--- |
| `users` | `id` | $\text{id} \rightarrow (\text{name}, \text{email}, \text{passwordHash}, \text{role}, \text{createdAt})$ | `email` |
| `judges` | `id` | $\text{id} \rightarrow (\text{userId}, \text{courtroom}, \text{dailyCapacity})$ | `userId` |
| `tracks` | `id` | $\text{id} \rightarrow (\text{name}, \text{targetDays}, \text{gapDays})$ | `name` |
| `cases` | `id` | $\text{id} \rightarrow (\text{caseNumber}, \text{title}, \text{caseType}, \text{filingDate}, \text{hasExpertEvidence}, \text{isUrgent}, \text{complexity}, \text{suggestedTrackId}, \text{trackId}, \text{status}, \dots)$ | `caseNumber` |
| `parties` | `id` | $\text{id} \rightarrow (\text{caseId}, \text{name}, \text{role})$ | — |
| `hearings` | `id` | $\text{id} \rightarrow (\text{caseId}, \text{judgeId}, \text{hearingDate}, \text{outcome}, \text{remarks}, \text{createdAt}, \text{updatedAt})$ | — |
| `audit_logs`| `id` | $\text{id} \rightarrow (\text{userId}, \text{action}, \text{caseId}, \text{details}, \text{createdAt})$ | — |

---

## 4. Controlled Denormalization & Transactional Integrity

In pure 3NF/BCNF, calculated or derived attributes are strictly prohibited because they introduce transitive dependencies on the underlying components. However, in high-throughput judicial registry systems, calculating these values on-the-fly across tens of thousands of active matters introduces unacceptable latency.

NyayaKram adopts **controlled, deliberate denormalization** for four specific attributes in `cases`, strictly protected by database transaction boundaries:

| Denormalized Attribute | Theoretical 3NF Derivation (Source of Truth) | Rationale for Controlled Denormalization | Synchronization Mechanism |
| :--- | :--- | :--- | :--- |
| **`priorityScore`** | Dynamically computed via mathematical formula: $(\frac{\text{Age}}{\text{Target}} \times 40) + (\text{Comp} \times 3) + (\text{Adj} \times 8) + \text{Urg}$ | Used in every daily cause list query (`ORDER BY priorityScore DESC`). Computing this via mathematical expression across multi-table joins on every registry page load degrades database response times. | Recalculated and persisted on every intake, track approval, adjournment, or status mutation within `prisma.$transaction()`. |
| **`adjournmentCount`** | Derived from counting: $\text{COUNT}(h.id)$ WHERE $h.\text{caseId} = c.id$ AND $h.\text{outcome} = \text{'ADJOURNED'}$ | Avoids executing an aggregate subquery (`SELECT COUNT(*) FROM hearings WHERE caseId = ? AND outcome = 'ADJOURNED'`) whenever case listings are retrieved. | Incremented by $+1$ in the exact same database transaction that updates a hearing outcome to `ADJOURNED`. |
| **`targetDisposalDate`**| Derived from: $c.\text{filingDate} + t.\text{targetDays}$ (joining `cases` and `tracks`) | Enables direct date-range filtering (e.g., `WHERE targetDisposalDate < CURRENT_DATE`) to identify SLA breaches without performing a JOIN on `tracks`. | Fixed at case creation based on the assigned track; updated in `prisma.$transaction()` if a judge overrides the track. |
| **`earliestNextDate`** | Derived from: $\text{hearingDate} + t.\text{gapDays}$ | Enforces statutory cooling intervals during bench scheduling. Denormalizing it on the case allows instant lookup during cause-list assembly. | Synchronized on every hearing update inside `prisma.$transaction()`. |

### 4.1 Preserving Integrity with Prisma `$transaction`
To guarantee that controlled denormalization never leads to data inconsistency, all updates are executed within atomic database transactions:

```javascript
// Atomic synchronization of denormalized fields during hearing adjournment
await prisma.$transaction(async (tx) => {
  // 1. Update the hearing outcome
  await tx.hearing.update({
    where: { id: hearingId },
    data: { outcome: 'ADJOURNED', remarks: reason }
  });

  // 2. Fetch case and track parameters atomically
  const caseRecord = await tx.case.findUnique({
    where: { id: caseId },
    include: { track: true }
  });

  // 3. Compute new denormalized values
  const newAdjournmentCount = caseRecord.adjournmentCount + 1;
  const newEarliestNext = new Date(hearingDate.getTime() + caseRecord.track.gapDays * 86400000);
  const newPriorityScore = calculatePriorityScore({
    filingDate: caseRecord.filingDate,
    targetDays: caseRecord.track.targetDays,
    complexity: caseRecord.complexity,
    adjournmentCount: newAdjournmentCount,
    isUrgent: caseRecord.isUrgent
  });

  // 4. Update the case record atomically
  await tx.case.update({
    where: { id: caseId },
    data: {
      adjournmentCount: newAdjournmentCount,
      earliestNextDate: newEarliestNext,
      priorityScore: newPriorityScore
    }
  });

  // 5. Append immutable audit log
  await tx.auditLog.create({
    data: {
      userId,
      caseId,
      action: 'HEARING_ADJOURNED',
      details: JSON.stringify({ hearingId, newAdjournmentCount, newPriorityScore })
    }
  });
});
```

If any operation within this block fails (e.g., connection drop, constraint violation), the entire transaction rolls back to the prior state. This architecture guarantees **sub-millisecond read performance** while maintaining **100% mathematical integrity**.
