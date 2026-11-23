# Deliverable 5: Live Sample Records

**System**: NyayaKram — District Court Case Flow Management System (DCFM)  
**Database**: PostgreSQL 16 on Neon Serverless Cloud  
**Security Notice**: All sensitive credentials and bcrypt password hashes have been sanitized to `[REDACTED_BCRYPT_HASH]`. No secrets or environment credentials are exposed.  

---

## 1. Table: `users`

Represents administrative staff, judicial officers, and legal counsel.

| id | name | email | passwordHash | role | createdAt |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `7cd2890b-e9a9-4372-965e-5518cfa39f87` | Arun Verma (Court Clerk) | `clerk@court.gov.in` | `[REDACTED_BCRYPT_HASH]` | `CLERK` | 2026-11-06 11:52:09.768 |
| `cfb5c2d6-fee2-43c3-9cf6-682a92e73b93` | Justice Shalini Saxena | `judge.saxena@court.gov.in` | `[REDACTED_BCRYPT_HASH]` | `JUDGE` | 2026-11-06 11:52:09.977 |
| `1fb06d71-f7a0-410c-b488-bf8e57eb8d22` | Justice Rajesh Kumar | `judge.kumar@court.gov.in` | `[REDACTED_BCRYPT_HASH]` | `JUDGE` | 2026-11-06 11:52:10.295 |
| `b6efdfb0-1a4f-4dc0-b5db-6dcf7691e3b4` | Justice Priya Nair | `judge.nair@court.gov.in` | `[REDACTED_BCRYPT_HASH]` | `JUDGE` | 2026-11-06 11:52:10.507 |
| `4d97146d-cc06-4df1-9f0c-5ac27db3bdfd` | Advocate Rohit Mehta | `rohit.lawyer@court.gov.in` | `[REDACTED_BCRYPT_HASH]` | `LAWYER` | 2026-11-06 11:52:10.712 |
| `b6830a5a-a7a8-4073-88af-b9b7d06876ac` | Advocate Pooja Sharma | `lawyer.test.1793988776029@court.gov.in` | `[REDACTED_BCRYPT_HASH]` | `LAWYER` | 2026-11-06 18:12:57.955 |

```json
[
  {
    "id": "7cd2890b-e9a9-4372-965e-5518cfa39f87",
    "name": "Arun Verma (Court Clerk)",
    "email": "clerk@court.gov.in",
    "passwordHash": "[REDACTED_BCRYPT_HASH]",
    "role": "CLERK",
    "createdAt": "2026-11-06T11:52:09.768Z"
  },
  {
    "id": "cfb5c2d6-fee2-43c3-9cf6-682a92e73b93",
    "name": "Justice Shalini Saxena",
    "email": "judge.saxena@court.gov.in",
    "passwordHash": "[REDACTED_BCRYPT_HASH]",
    "role": "JUDGE",
    "createdAt": "2026-11-06T11:52:09.977Z"
  }
]
```

---

## 2. Table: `judges`

Represents judicial bench allocations and courtroom hearing slot capacities.

| id | userId | judgeName | courtroom | dailyCapacity |
| :--- | :--- | :--- | :--- | :--- |
| `72c34f79-a388-41d1-8662-66f8ceafce9f` | `807e4878-1e51-4834-bb28-99921184a09f` | Justice Shalini Saxena | Courtroom 101 | 10 |
| `5dec2d32-8c91-44cf-9857-3dde1dca2465` | `cfb5c2d6-fee2-43c3-9cf6-682a92e73b93` | Justice Shalini Saxena | Courtroom 101 | 10 |
| `ac5aa3bb-d329-4215-8159-1ffadddd26d1` | `01dd3f0c-8925-4bb6-8f36-489eafbf846f` | Justice Rajesh Kumar | Courtroom 102 | 8 |
| `39948406-da2d-4a13-921b-b532fbfd0c4c` | `1fb06d71-f7a0-410c-b488-bf8e57eb8d22` | Justice Rajesh Kumar | Courtroom 102 | 8 |
| `888f5bdb-43c7-4619-af11-957a38ed115d` | `b6efdfb0-1a4f-4dc0-b5db-6dcf7691e3b4` | Justice Priya Nair | Courtroom 103 | 12 |

```json
[
  {
    "id": "72c34f79-a388-41d1-8662-66f8ceafce9f",
    "userId": "807e4878-1e51-4834-bb28-99921184a09f",
    "judgeName": "Justice Shalini Saxena",
    "courtroom": "Courtroom 101",
    "dailyCapacity": 10
  },
  {
    "id": "888f5bdb-43c7-4619-af11-957a38ed115d",
    "userId": "b6efdfb0-1a4f-4dc0-b5db-6dcf7691e3b4",
    "judgeName": "Justice Priya Nair",
    "courtroom": "Courtroom 103",
    "dailyCapacity": 12
  }
]
```

---

## 3. Table: `tracks`

Master track definitions for Differentiated Case Flow Management.

| id | name | targetDays | gapDays |
| :--- | :--- | :--- | :--- |
| `70fdbc67-37e6-47fb-b219-362626466750` | FAST | 90 | 7 |
| `f202390e-2662-49e7-8f72-e753ab05007c` | STANDARD | 365 | 21 |
| `09d9cdb0-6b44-42ea-9755-e8462001fc1f` | COMPLEX | 730 | 45 |

```json
[
  {
    "id": "70fdbc67-37e6-47fb-b219-362626466750",
    "name": "FAST",
    "targetDays": 90,
    "gapDays": 7
  },
  {
    "id": "f202390e-2662-49e7-8f72-e753ab05007c",
    "name": "STANDARD",
    "targetDays": 365,
    "gapDays": 21
  },
  {
    "id": "09d9cdb0-6b44-42ea-9755-e8462001fc1f",
    "name": "COMPLEX",
    "targetDays": 730,
    "gapDays": 45
  }
]
```

---

## 4. Table: `cases`

Active, listed, and disposed court matters.

| id | caseNumber | title | caseType | filingDate | isUrgent | complexity | status | priorityScore | targetDisposalDate | earliestNextDate | adjournmentCount | judgeId |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `97bf90a8-...` | `DCM/2026/0001` | State of Delhi vs. Rakesh Sharma | `BAIL` | 2026-10-15 | `true` | 1 | `PENDING` | 63.3 | 2027-01-13 | 2026-11-21 | 0 | `72c34f79-...` |
| `a88a6205-...` | `DCM/2026/0002` | Apex Logistics Ltd. vs. Om Exports | `CHEQUE_BOUNCE`| 2026-07-27 | `false` | 2 | `PENDING` | 132.2 | 2026-10-25 | 2026-11-21 | 2 | `ac5aa3bb-...` |
| `6f2947d0-...` | `DCM/2026/0003` | Mohan Lal vs. Sunita Devi | `RENT_DISPUTE` | 2026-09-30 | `false` | 3 | `LISTED` | 50.0 | 2026-12-29 | 2026-11-14 | 0 | `888f5bdb-...` |
| `e255d9da-...` | `DCM/2026/0004` | State of Delhi vs. Vijay Anand | `BAIL` | 2026-08-11 | `true` | 1 | `LISTED` | 140.6 | 2026-11-09 | 2026-11-14 | 1 | `72c34f79-...` |
| `4dd51791-...` | `DCM/2026/0005` | Kaveri Traders vs. Zenith Global | `CHEQUE_BOUNCE`| 2026-09-15 | `false` | 2 | `DISPOSED` | 66.7 | 2026-12-14 | 2026-11-21 | 0 | `ac5aa3bb-...` |
| `3e0f692f-...` | `DCM/2026/0006` | Ram Prakash & Ors. vs. MCD | `CIVIL_SUIT` | 2026-05-18 | `false` | 5 | `PENDING` | 54.3 | 2027-05-18 | 2026-11-21 | 1 | `888f5bdb-...` |

```json
[
  {
    "id": "97bf90a8-3553-4938-8dad-841aca6241c3",
    "caseNumber": "DCM/2026/0001",
    "title": "State of Delhi vs. Rakesh Sharma",
    "caseType": "BAIL",
    "filingDate": "2026-10-15",
    "isUrgent": true,
    "complexity": 1,
    "trackId": "70fdbc67-37e6-47fb-b219-362626466750",
    "status": "PENDING",
    "priorityScore": 63.3,
    "targetDisposalDate": "2027-01-13",
    "earliestNextDate": "2026-11-21",
    "adjournmentCount": 0,
    "judgeId": "72c34f79-a388-41d1-8662-66f8ceafce9f"
  }
]
```

---

## 5. Table: `parties`

Litigants, state representatives, and defense advocates.

| id | caseId | name | role |
| :--- | :--- | :--- | :--- |
| `f57d6c3d-44e4-4c83-b6b6-e334ddc8b9f6` | `97bf90a8-3553-4938-8dad-841aca6241c3` | State of Delhi (Prosecution) | `PETITIONER` |
| `ba24bc16-0bb0-4932-90d2-cfc09fe00207` | `97bf90a8-3553-4938-8dad-841aca6241c3` | Rakesh Sharma | `RESPONDENT` |
| `2d029349-446b-4cff-9d45-77b8629dc32b` | `97bf90a8-3553-4938-8dad-841aca6241c3` | Advocate Rohit Mehta | `ADVOCATE` |
| `d9917dc2-8165-4562-bbfd-aea7fec9f870` | `a88a6205-127f-4665-b4dd-d0f70e1baa42` | Apex Logistics Ltd. | `PETITIONER` |
| `20c66fc9-cf09-414b-8bb2-b3fdf43f188d` | `a88a6205-127f-4665-b4dd-d0f70e1baa42` | Om Exports & Anr. | `RESPONDENT` |
| `5f8bb6b2-cf9b-420f-8ed5-e811fd92ed3f` | `6f2947d0-c681-4075-9c75-f745408d226a` | Mohan Lal | `PETITIONER` |

```json
[
  {
    "id": "f57d6c3d-44e4-4c83-b6b6-e334ddc8b9f6",
    "caseId": "97bf90a8-3553-4938-8dad-841aca6241c3",
    "name": "State of Delhi (Prosecution)",
    "role": "PETITIONER"
  },
  {
    "id": "ba24bc16-0bb0-4932-90d2-cfc09fe00207",
    "caseId": "97bf90a8-3553-4938-8dad-841aca6241c3",
    "name": "Rakesh Sharma",
    "role": "RESPONDENT"
  }
]
```

---

## 6. Table: `hearings`

Bench proceedings and judicial hearing schedules.

| id | caseId | judgeId | hearingDate | outcome | remarks | createdAt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `a782df05-...` | `f6b96f39-...` | `ac5aa3bb-...` | 2026-11-14 | `SCHEDULED` | Commercial summary hearing on injunction. | 2026-11-14 07:42:07.832 |
| `948bc12e-...` | `e1087037-...` | `888f5bdb-...` | 2026-11-14 | `SCHEDULED` | Urgent interim bail application listed for orders. | 2026-11-14 08:29:27.731 |
| `f9455d63-...` | `6f2947d0-...` | `888f5bdb-...` | 2026-11-14 | `SCHEDULED` | Daily cause list listing for evidence recording. | 2026-11-14 07:42:03.358 |
| `822652f6-...` | `e255d9da-...` | `72c34f79-...` | 2026-11-14 | `SCHEDULED` | Listed for final bail arguments. | 2026-11-14 07:42:04.318 |
| `a76331dd-...` | `130cd920-...` | `72c34f79-...` | 2026-11-14 | `SCHEDULED` | Hearing on arbitration claim enforcement. | 2026-11-14 07:42:12.753 |
| `88568720-...` | `1cf9a2e7-...` | `888f5bdb-...` | 2026-11-14 | `SCHEDULED` | Cross-examination of respondent on lease deed execution. | 2026-11-14 08:29:34.202 |

```json
[
  {
    "id": "a782df05-eda9-49dc-a506-50a1f4722914",
    "caseId": "f6b96f39-9fae-4ee3-ac68-ed3951a2f8bb",
    "judgeId": "ac5aa3bb-d329-4215-8159-1ffadddd26d1",
    "hearingDate": "2026-11-14",
    "outcome": "SCHEDULED",
    "remarks": "Commercial summary hearing on injunction.",
    "createdAt": "2026-11-14T07:42:07.832Z"
  }
]
```

---

## 7. Table: `audit_logs`

Forensic immutable activity history.

| id | userId | action | caseId | details | createdAt |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `8cb6d988-...` | `7cd2890b-...` | `CASE_REGISTERED` | `a05546af-...` | `{"caseNumber":"DCM/2026/0145","complexity":9,"priorityScore":300.8}` | 2026-11-14 08:30:29.412 |
| `208ec5b3-...` | `7cd2890b-...` | `CASE_REGISTERED` | `beb95e33-...` | `{"caseNumber":"DCM/2026/0144","complexity":9,"priorityScore":131.4}` | 2026-11-14 08:30:26.227 |
| `765576c1-...` | `7cd2890b-...` | `CASE_REGISTERED` | `2d0e2b80-...` | `{"caseNumber":"DCM/2026/0143","complexity":6,"priorityScore":84.5}` | 2026-11-14 08:30:24.396 |
| `baf4edb4-...` | `7cd2890b-...` | `CASE_REGISTERED` | `173c9e99-...` | `{"caseNumber":"DCM/2026/0142","complexity":10,"priorityScore":91.2}` | 2026-11-14 08:30:23.277 |
| `06119224-...` | `7cd2890b-...` | `CASE_REGISTERED` | `249bd014-...` | `{"caseNumber":"DCM/2026/0141","complexity":8,"priorityScore":19.2}` | 2026-11-14 08:30:21.797 |
| `23815b43-...` | `7cd2890b-...` | `CASE_REGISTERED` | `ae792cf6-...` | `{"caseNumber":"DCM/2026/0140","complexity":8,"priorityScore":119.1}` | 2026-11-14 08:30:20.881 |

```json
[
  {
    "id": "8cb6d988-924a-41df-91df-b6050c0e29c8",
    "userId": "7cd2890b-e9a9-4372-965e-5518cfa39f87",
    "action": "CASE_REGISTERED",
    "caseId": "a05546af-f6e8-434b-ab05-9268ca74811e",
    "details": "{\"caseNumber\":\"DCM/2026/0145\",\"complexity\":9,\"priorityScore\":300.8}",
    "createdAt": "2026-11-14T08:30:29.412Z"
  }
]
```
