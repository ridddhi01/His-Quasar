# 🏥 Staff Department Assignment - Visual Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION SYSTEM                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   INPUT DATA        │
├─────────────────────┤
│ Users (without      │
│ departments)        │
│                     │
│ Departments         │
│ (without heads)     │
│                     │
│ Staff records       │
│ (with designation   │
│  and department)    │
└──────────┬──────────┘
           │
           ↓
┌──────────────────────────────────────────────────┐
│  assignUsersToDepartments.js                     │
├──────────────────────────────────────────────────┤
│  Phase 1: Process Staff Records                  │
│  ├─ Read Staff.department                        │
│  └─ Update User.department                       │
│                                                  │
│  Phase 2: Assign Department Heads                │
│  ├─ Find Staff with head designations            │
│  └─ Set Department.head                          │
│                                                  │
│  Phase 3: Role-Based Assignment                  │
│  ├─ Find unassigned users                        │
│  └─ Assign by role from mapping                  │
│                                                  │
│  Phase 4: Generate Report                        │
│  ├─ List all departments                         │
│  ├─ Show department heads                        │
│  └─ Print statistics                             │
└──────────┬───────────────────────────────────────┘
           │
           ↓
┌─────────────────────┐
│   OUTPUT DATA       │
├─────────────────────┤
│ Users with          │
│ department field    │
│ populated           │
│                     │
│ Departments with    │
│ head field set      │
│                     │
│ Comprehensive       │
│ summary report      │
└─────────────────────┘
```

---

## Data Flow Diagram

```
                    STAFF TABLE
                   ┌──────────────────┐
                   │ employeeId       │
                   │ user (FK→User)   │
                   │ department (FK)  │
                   │ designation      │
                   └────────┬─────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ↓                ↓                ↓
    ┌─────────────┐  ┌────────────────┐   ┌──────────────┐
    │Phase 1      │  │Phase 2         │   │Phase 3       │
    │Process      │  │Assign Heads    │   │Role-Based    │
    │Staff        │  │Check if        │   │Assignment    │
    │Records      │  │designation has │   │For unass-    │
    │            │  │head keywords    │   │igned users  │
    │Link user → │  │               │   │            │
    │department  │  │Set Dept.head   │   │Use ROLE_    │
    │            │  │               │   │MAPPING      │
    └──────┬──────┘  └────────┬───────┘   └──────┬──────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  USER TABLE          │
                    ├──────────────────────┤
                    │ _id                  │
                    │ username             │
                    │ role                 │
                    │ department (FK)  ✅  │ ← UPDATED
                    └──────────────────────┘
                              │
                              ↓
                    ┌──────────────────────┐
                    │ DEPARTMENT TABLE     │
                    ├──────────────────────┤
                    │ _id                  │
                    │ name                 │
                    │ head (FK→User) ✅    │ ← UPDATED
                    │ type                 │
                    └──────────────────────┘
```

---

## User Assignment Flow

```
START: User without department
            │
            ↓
   ┌─ Is there a Staff record?
   │        │
   ├─YES→ Take Staff.department
   │        │
   │   ┌────┴─── Staff.department exists?
   │   │          │
   │   ├─YES → Assign to that department
   │   │          │
   │   └─NO  → Check user's role
   │            │
   └─NO → Check user's role
            │
            ↓
    ROLE_DEPARTMENT_MAPPING
    │
    ├─ Doctor? → OPD
    ├─ Nurse? → Nursing
    ├─ Lab Tech? → Laboratory
    ├─ Pharmacist? → Pharmacy
    ├─ Admin? → (NO DEPARTMENT)
    └─ Other? → Check mapping
            │
            ↓
        ASSIGN DEPARTMENT
            │
            ↓
    END: User with department
```

---

## Department Head Assignment Flow

```
START: Department without head
            │
            ↓
    Get all Staff records
    for this department
            │
            ↓
    For each Staff member:
    ┌────────────────────────────┐
    │ Check Staff.designation    │
    │ for head keywords:         │
    │ • head                     │
    │ • hod                      │
    │ • director                 │
    │ • chief                    │
    │ • superintendent           │
    │ • senior consultant        │
    │ • head of department       │
    └────────────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    YES ↓                 ↓ NO
        │             Move to next
        │             Staff member
        │                 │
        ↓                 ↓
    SET DEPARTMENT.HEAD = STAFF.USER
        │
        ↓
    END: Department with head
```

---

## Role to Department Mapping

```
           USER ROLES
              ↓
    ┌─────────────────────┐
    │ doctor              │──→ OPD
    ├─────────────────────┤
    │ nurse               │──→ Nursing
    ├─────────────────────┤
    │ head_nurse          │──→ Nursing
    ├─────────────────────┤
    │ lab_tech            │──→ Laboratory
    ├─────────────────────┤
    │ radiologist         │──→ Radiology
    ├─────────────────────┤
    │ pharmacist          │──→ Pharmacy
    ├─────────────────────┤
    │ receptionist        │──→ Administration
    ├─────────────────────┤
    │ billing             │──→ Finance
    ├─────────────────────┤
    │ insurance           │──→ Finance
    ├─────────────────────┤
    │ inventory_manager   │──→ Inventory
    ├─────────────────────┤
    │ coder               │──→ Medical Coding
    ├─────────────────────┤
    │ senior_coder        │──→ Medical Coding
    ├─────────────────────┤
    │ admin               │──→ (NO DEPARTMENT)
    ├─────────────────────┤
    │ compliance          │──→ (NO DEPARTMENT)
    └─────────────────────┘
```

---

## Phase Execution Timeline

```
┌────────────────────────────────────────────────────────────┐
│                    EXECUTION TIMELINE                      │
└────────────────────────────────────────────────────────────┘

Connect to MongoDB
    ↓
    └─ 0.5 sec

Phase 1: Process Staff Records
    ├─ Query all Staff documents    ─ 1-2 sec
    ├─ For each, update User        ─ 2-3 sec
    └─ Total Phase 1                ─ 3-5 sec

Phase 2: Assign Department Heads
    ├─ Query Staff with head keywords ─ 1 sec
    ├─ For each, update Department    ─ 1-2 sec
    └─ Total Phase 2                  ─ 2-3 sec

Phase 3: Role-Based Assignment
    ├─ Query unassigned users      ─ 1 sec
    ├─ For each, find department   ─ 1-2 sec
    ├─ Update User                 ─ 1 sec
    └─ Total Phase 3               ─ 3-4 sec

Phase 4: Generate Report
    ├─ Query all departments       ─ 0.5 sec
    ├─ Format and print            ─ 0.5 sec
    └─ Total Phase 4               ─ 1 sec

Close Connection
    └─ 0.5 sec

TOTAL TIME: 2-5 minutes (depending on data size)
```

---

## Output Report Structure

```
┌─────────────────────────────────────────────────────┐
│            MIGRATION OUTPUT REPORT                  │
└─────────────────────────────────────────────────────┘

✓ Connected to MongoDB

🔄 Starting User-to-Department Assignment...

Step 1 Report:
├─ Staff records processed: NNN
├─ Users updated: MMM
└─ Status: ✓ Complete

Step 2 Report:
├─ Department heads assigned: KK
├─ Departments updated: KK
└─ Status: ✓ Complete

Step 3 Report:
├─ Users assigned by role: XX
└─ Status: ✓ Complete

Step 4 Report:
┌──────────────────────────────────────────┐
│ Department Summary Table                 │
├──────────────────────────────────────────┤
│ Name    │ Head              │ Staff Count │
├─────────┼───────────────────┼─────────────┤
│ OPD     │ Dr. Rajesh Kumar  │ 25          │
│ Nursing │ Ms. Priya Singh   │ 18          │
│ Lab     │ Mr. Amit Patel    │ 12          │
│ ...     │ ...               │ ...         │
└──────────────────────────────────────────┘

Statistics:
├─ Total staff assigned: ZZZ
├─ Admin users (no dept): Y
├─ Unassigned users: 0
└─ Success rate: 100%

✅ User-to-Department assignment completed successfully!
```

---

## Integration with incident.controller.js

```
┌──────────────────────────────┐
│ User requests incident        │
│ POST /api/incidents           │
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│ Controller receives request   │
│ req.user.department = ???     │
└──────────────┬───────────────┘
               │
         ┌─────┴─────┐
         │            │
    HAS DEPT      NO DEPT
         │            │
         ↓            ↓
    ✅ ALLOW      ❌ ERROR
    Create        "User is not
    Incident      assigned to
                  any department"
         │
         ↓
    Auto-assign to
    Department head
         │
         ↓
    Create incident
    report with
    assignedTo = head
         │
         ↓
    ✅ SUCCESS
```

---

## Database Consistency

```
BEFORE MIGRATION          AFTER MIGRATION
─────────────────────     ─────────────────────

USER TABLE                USER TABLE
┌──────────────┐          ┌──────────────┐
│ _id          │          │ _id          │
│ username     │          │ username     │
│ role         │          │ role         │
│ department   │          │ department✅  │
│   (null)     │          │   (ObjectId) │
└──────────────┘          └──────────────┘

DEPARTMENT TABLE          DEPARTMENT TABLE
┌──────────────┐          ┌──────────────┐
│ _id          │          │ _id          │
│ name         │          │ name         │
│ head         │          │ head✅       │
│   (null)     │          │   (ObjectId) │
└──────────────┘          └──────────────┘

STAFF TABLE              STAFF TABLE
(unchanged)              (unchanged)
┌──────────────┐          ┌──────────────┐
│ _id          │          │ _id          │
│ employeeId   │          │ employeeId   │
│ user         │          │ user         │
│ department   │          │ department   │
└──────────────┘          └──────────────┘
```

---

## Safety & Reversibility

```
┌───────────────────────────────────────────┐
│         MIGRATION IS SAFE BECAUSE          │
└───────────────────────────────────────────┘

✅ Idempotent
   Running multiple times won't cause duplicates
   Only updates records that need updating

✅ No Deletion
   Only updates existing records
   No data is ever deleted

✅ Transactional
   Each operation is validated
   Failed operations don't cascade

✅ Logging
   Every change is logged to console
   Full audit trail available

✅ Reversible
   Rollback script provided
   Can unset fields if needed

✅ No Downtime Required
   Runs alongside live system
   No backend restart needed
```

---

## Troubleshooting Decision Tree

```
┌─ Migration fails to start
│  │
│  ├─ Check: MongoDB running?
│  ├─ Check: MONGODB_URI correct?
│  └─ Check: Network connectivity?
│
├─ No department heads assigned
│  │
│  ├─ Check: Staff records exist?
│  ├─ Check: Designations have head keywords?
│  └─ Check: Designations spelled correctly?
│
├─ Users still unassigned
│  │
│  ├─ Check: Role in ROLE_DEPARTMENT_MAPPING?
│  ├─ Check: Department exists in database?
│  └─ Check: Department name matches exactly?
│
└─ Migration crashes midway
   │
   ├─ Check: MongoDB logs for errors
   ├─ Check: Data integrity of Staff records
   └─ Try running again (it's idempotent)
```

---

**Visual Guide Created:** January 24, 2026
**Status:** Complete
**Use:** Reference during and after migration execution
