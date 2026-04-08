# Staff Department Assignment - Implementation Summary

## Overview
Created a comprehensive one-time migration script to assign all internal staff members to their respective departments, including setting department heads.

## Files Created

### 1. **assignUsersToDepartments.js** (Main Script)
Location: `/hospital-his-backend/scripts/assignUsersToDepartments.js`

**Features:**
- Connects to MongoDB and processes all staff records
- Links each user to their department (from Staff model)
- Identifies and assigns department heads based on designation keywords
- Falls back to role-based department assignment for unassigned users
- Generates comprehensive summary report

**Designations detected as department heads:**
- Head, Head of Department, HOD, Director, Chief, Superintendent, Senior Consultant

**Role-to-Department Mapping:**
```
Doctor → OPD
Nurse / Head Nurse → Nursing
Lab Tech → Laboratory
Radiologist → Radiology
Pharmacist → Pharmacy
Receptionist → Administration
Billing / Insurance → Finance
Inventory Manager → Inventory
Coder / Senior Coder → Medical Coding
```

### 2. **MIGRATION_README.md** (Detailed Documentation)
Location: `/hospital-his-backend/scripts/MIGRATION_README.md`

Contains:
- What the script does (4-step process)
- Prerequisites and requirements
- How to run the script (2 methods)
- Department head designation keywords
- Role-based mapping explanation
- Example output
- Troubleshooting guide
- Manual fix instructions for MongoDB

### 3. **RUN_MIGRATION.md** (Quick Reference)
Location: `/hospital-his-backend/scripts/RUN_MIGRATION.md`

Quick start guide with:
- Simple run command
- What happens step-by-step
- Expected results
- Key features
- Next steps

## How to Run

```bash
cd hospital-his-backend
node scripts/assignUsersToDepartments.js
```

## Script Flow

```
┌─────────────────────────────────────────┐
│ Connect to MongoDB                      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Step 1: Process Staff Records           │
│ - Link users to departments via Staff   │
│ - Update User.department field          │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Step 2: Assign Department Heads         │
│ - Find staff with head designations     │
│ - Set Department.head field             │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Step 3: Role-Based Assignment           │
│ - Assign unassigned users by role       │
│ - Use ROLE_DEPARTMENT_MAPPING           │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Step 4: Generate Summary Report         │
│ - List all departments and heads        │
│ - Count staff per department            │
│ - Show statistics                       │
└──────────────┬──────────────────────────┘
               ↓
        ✅ Migration Complete
```

## Output Example

```
✓ Connected to MongoDB

🔄 Starting User-to-Department Assignment...

Step 1: Processing Staff records...
✓ Processed 150 Staff records, updated 120 users

Step 2: Assigning Department Heads...
  • OPD: Dr. Rajesh Kumar
  • Nursing: Ms. Priya Singh
  • Laboratory: Mr. Amit Patel
✓ Department heads assigned: 15

Step 3: Assigning unassigned users by role...
  • John Smith (doctor) → General OPD
✓ Role-based assignments: 12

Step 4: Generating Summary Report...

📊 Department Summary:
─────────────────────────────────────────────────────
OPD                            | Head: Dr. Rajesh Kumar   | Staff: 25
Nursing                        | Head: Ms. Priya Singh    | Staff: 18
Laboratory                     | Head: Mr. Amit Patel     | Staff: 12
...

✓ Total Staff Assigned: 280
✓ Admin Users (no dept): 5
⚠ Unassigned Users: 0

✅ User-to-Department assignment completed successfully!
```

## Safety & Reliability

✅ **Safe to run multiple times** - Only updates records that need updating
✅ **Detailed logging** - See exactly what's being changed
✅ **Error handling** - Clear error messages for troubleshooting
✅ **Comprehensive output** - Final report shows all assignments
✅ **Automatic cleanup** - Closes DB connection properly

## What Gets Updated

### User Collection
- `User.department` field populated from Staff record
- Unassigned users get department based on role

### Department Collection
- `Department.head` field set to appropriate staff member
- Only updates departments with eligible head candidates

### No Changes To
- Staff collection (read-only for this script)
- Other user fields
- Other department fields

## Integration with incident.controller.js

The updated `incident.controller.js` now:
- ✅ Requires users to have a department assigned
- ✅ Auto-assigns incidents to department heads
- ✅ Enforces department-based access control
- ✅ Works seamlessly with this migration

## Customization

To modify the script behavior, edit these constants in `assignUsersToDepartments.js`:

1. **DEPARTMENT_HEAD_DESIGNATIONS** (line ~32)
   - Add more keywords to identify heads
   - Example: Add "head" variations for different languages

2. **ROLE_DEPARTMENT_MAPPING** (line ~38)
   - Change default departments for roles
   - Add new role mappings

## Next Steps

1. Run the migration script
2. Review the summary report
3. Check for any unassigned users
4. Make manual adjustments if needed
5. Test incident creation with assigned users
6. Verify incident.controller.js works as expected

## Support & Troubleshooting

See `MIGRATION_README.md` for:
- Database connection issues
- No heads being assigned
- Users still unassigned
- Manual MongoDB fixes

---

**Created:** January 24, 2026
**Purpose:** One-time migration to assign staff to departments
**Status:** Ready to run
