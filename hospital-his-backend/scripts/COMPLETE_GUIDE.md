# 🏥 Staff Department Assignment - Complete Guide

## 📋 Overview

This is a complete one-time migration system to assign all internal staff to their respective departments. The migration ensures:

- ✅ Every staff member is linked to a department
- ✅ Department heads are properly designated
- ✅ Role-based fallback assignment for any unassigned users
- ✅ Full audit trail and comprehensive reporting
- ✅ Seamless integration with the incident management system

---

## 🚀 Quick Start

### To Run the Migration:

```bash
cd hospital-his-backend
node scripts/assignUsersToDepartments.js
```

**Time Required:** 2-5 minutes depending on database size

**Database Impact:** Read + Write operations, no data loss

---

## 📁 Files in This Migration

| File | Purpose |
|------|---------|
| `assignUsersToDepartments.js` | Main migration script |
| `RUN_MIGRATION.md` | Quick reference guide (START HERE) |
| `MIGRATION_README.md` | Detailed documentation |
| `MIGRATION_CHECKLIST.md` | Pre/post-migration checklist |
| `DATA_STRUCTURE_REFERENCE.md` | Database schema reference |
| `IMPLEMENTATION_SUMMARY.md` | Complete implementation overview |
| `COMPLETE_GUIDE.md` | This file - everything you need to know |

---

## 🔍 What the Script Does

### Phase 1: Process Staff Records
- Reads all Staff documents from database
- Links each user to their department via Staff record
- Updates User.department field if not already set

### Phase 2: Assign Department Heads
- Finds all staff with "head" designation keywords
- Sets them as Department.head
- Examples: HOD, Director, Chief, Head of Department, etc.

### Phase 3: Role-Based Assignment
- Finds users without department assignment
- Assigns them based on role using predefined mapping
- Doctors → OPD, Nurses → Nursing, etc.

### Phase 4: Generate Report
- Lists all departments with assigned heads
- Shows staff count per department
- Reports statistics and unassigned users

---

## 👥 Who Gets Assigned Where

### Explicit Assignment (from Staff Record)
If a user has a Staff record with department field:
```
Staff.department → User.department ✅
```

### Role-Based Assignment (Fallback)
If a user has no Staff record or Staff has no department:
```
User.role → ROLE_DEPARTMENT_MAPPING → User.department ✅
```

### Department Head Assignment
If a user's designation contains head keywords:
```
Staff.designation: "HOD - Cardiology"
  ↓ (contains "HOD")
Department.head = User ✅
```

---

## 📊 Expected Output

The script will show something like:

```
✓ Connected to MongoDB

🔄 Starting User-to-Department Assignment...

Step 1: Processing Staff records...
✓ Processed 150 Staff records, updated 120 users

Step 2: Assigning Department Heads...
  • OPD: Dr. Rajesh Kumar
  • Nursing: Ms. Priya Singh
  • Laboratory: Mr. Amit Patel
  • Radiology: Dr. Amit Verma
  • Pharmacy: Mr. Suresh Kumar
✓ Department heads assigned: 15

Step 3: Assigning unassigned users by role...
  • John Smith (doctor) → General OPD
  • Jane Doe (nurse) → Nursing
  • Mike Johnson (lab_tech) → Laboratory
✓ Role-based assignments: 12

Step 4: Generating Summary Report...

📊 Department Summary:
────────────────────────────────────────────────────
OPD                            | Head: Dr. Rajesh Kumar   | Staff: 25
Nursing                        | Head: Ms. Priya Singh    | Staff: 18
Laboratory                     | Head: Mr. Amit Patel     | Staff: 12
Radiology                      | Head: Dr. Amit Verma     | Staff: 8
Pharmacy                       | Head: Mr. Suresh Kumar   | Staff: 6
Finance                        | Not Assigned             | Staff: 4
Administration                 | Not Assigned             | Staff: 3
────────────────────────────────────────────────────

✓ Total Staff Assigned: 280
✓ Admin Users (no dept): 5
⚠ Unassigned Users: 0

✅ User-to-Department assignment completed successfully!
```

---

## ✅ Pre-Migration Checklist

Before running the script:

```
□ MongoDB is running
□ .env file has correct MONGODB_URI or DB_URL
□ Network connectivity to database is verified
□ All User records exist in database
□ All Department records exist in database
□ Staff records have correct structure
□ Database backup created (recommended)
```

---

## 🔄 Step-by-Step Execution

### Step 1: Preparation
```bash
# Navigate to backend directory
cd hospital-his-backend

# Verify .env file
cat .env | grep MONGODB_URI

# Optional: Check database status
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('✓ DB OK')).catch(e => console.log('✗ DB FAIL:', e.message))"
```

### Step 2: Run Migration
```bash
# Execute the migration
node scripts/assignUsersToDepartments.js

# Wait for "✅ User-to-Department assignment completed successfully!"
```

### Step 3: Verification
```bash
# Verify in MongoDB shell or using MongoDB Compass:

# Check users have departments
db.users.countDocuments({ department: { $exists: true } })

# Check department heads are set
db.departments.countDocuments({ head: { $exists: true } })

# Sample a user
db.users.findOne({ _id: ObjectId("...") }, { username: 1, department: 1, role: 1 })
```

---

## 🎯 Role-to-Department Mapping

The script uses this mapping for auto-assignment:

```javascript
{
  doctor              → OPD
  nurse               → Nursing
  head_nurse          → Nursing
  lab_tech            → Laboratory
  radiologist         → Radiology
  pharmacist          → Pharmacy
  receptionist        → Administration
  billing             → Finance
  insurance           → Finance
  inventory_manager   → Inventory
  coder               → Medical Coding
  senior_coder        → Medical Coding
  admin               → (no department)
  compliance          → (no department)
}
```

---

## 🎖️ Head Designation Keywords

Staff with these keywords in their designation become department heads:

- `head` - "Head of Cardiology"
- `head of department` - "Head of Department"
- `hod` - "HOD - Emergency"
- `director` - "Director of Operations"
- `chief` - "Chief Surgeon"
- `superintendent` - "Superintendent Nurse"
- `senior consultant` - "Senior Consultant - OPD"

**Case-insensitive!** Works with variations like "HOD", "hod", "HoD", etc.

---

## 🛡️ Safety Features

### This migration is SAFE because:

✅ **Idempotent** - Running multiple times won't cause duplicates
✅ **No deletion** - Only updates, never deletes data
✅ **Validation** - Checks departments and users exist first
✅ **Logging** - Shows every change being made
✅ **Error handling** - Graceful failures with clear messages
✅ **Rollback possible** - Can revert if needed (see below)

---

## 🔧 Customization

### Modify Department Head Keywords

Edit `assignUsersToDepartments.js` line ~32:

```javascript
const DEPARTMENT_HEAD_DESIGNATIONS = [
    'head',
    'head of department',
    'hod',
    'director',
    'chief',
    'superintendent',
    'senior consultant',
    // Add your custom keywords here:
    'incharge',
    'manager',
];
```

### Modify Role-Department Mapping

Edit `assignUsersToDepartments.js` line ~38:

```javascript
const ROLE_DEPARTMENT_MAPPING = {
    [USER_ROLES.DOCTOR]: 'OPD',
    [USER_ROLES.NURSE]: 'Nursing',
    // Change these mappings as needed for your hospital
    [USER_ROLES.YOUR_ROLE]: 'Your Department',
};
```

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to MongoDB"
**Solution:**
- Verify MongoDB is running: `mongo --version`
- Check MONGODB_URI in .env file
- Test connection: `mongosh "mongodb://..."`

### Issue: "No department heads assigned"
**Solution:**
- Check Staff records have designation field
- Verify designations contain head keywords
- Run: `db.staff.find({ designation: /head|hod|director/i }).count()`

### Issue: "Users still unassigned"
**Solution:**
- Check if role exists in ROLE_DEPARTMENT_MAPPING
- Verify department exists with matching name
- Create missing departments first

### Issue: "Script crashes midway"
**Solution:**
- Check database logs: `tail -f database.log`
- Verify data integrity: `db.staff.findOne()`
- Try running again - it's idempotent

---

## ↩️ Rollback (If Needed)

### Complete Rollback
```javascript
// In MongoDB shell - CAREFUL! This removes all assignments
db.users.updateMany(
  { role: { $ne: "admin" } },
  { $unset: { department: "" } }
)

db.departments.updateMany(
  {},
  { $unset: { head: "" } }
)

// Then run migration again if needed
```

### Selective Rollback
```javascript
// Just for specific department
db.users.updateMany(
  { department: ObjectId("dept_id") },
  { $unset: { department: "" } }
)

db.departments.updateOne(
  { _id: ObjectId("dept_id") },
  { $unset: { head: "" } }
)
```

---

## 📈 Post-Migration Integration

The incident.controller.js now expects users to have departments:

```javascript
// In incident.controller.js
const userDepartment = req.user.department;
if (!userDepartment) {
    return next(new ErrorResponse('User is not assigned to any department', 400));
}
```

**After migration**, this will work seamlessly:
- ✅ Users can create incidents
- ✅ Incidents auto-assign to department heads
- ✅ Department-based access control works
- ✅ RBAC enforces department boundaries

---

## 📞 Support Resources

| Resource | Location | Use Case |
|----------|----------|----------|
| Quick Start | `RUN_MIGRATION.md` | First-time runners |
| Detailed Docs | `MIGRATION_README.md` | In-depth understanding |
| Pre/Post Checks | `MIGRATION_CHECKLIST.md` | Validation steps |
| Data Reference | `DATA_STRUCTURE_REFERENCE.md` | Schema details |
| Implementation | `IMPLEMENTATION_SUMMARY.md` | Technical overview |

---

## 📝 After Running

### Document Everything
- [ ] Record migration start time and end time
- [ ] Screenshot the final report
- [ ] Note any customizations made
- [ ] Document any issues encountered
- [ ] Share results with team

### Notify Stakeholders
- [ ] Inform development team
- [ ] Update project tracker
- [ ] Document in team wiki
- [ ] Share expected changes with operations

### Perform Integration Tests
- [ ] Test creating incident as staff member
- [ ] Verify department head receives assignment
- [ ] Check RBAC enforcement
- [ ] Test incident viewing by role

---

## 🎓 Learning Resources

### MongoDB Queries for Understanding

```javascript
// See all users and their departments
db.users.aggregate([
  { $match: { isActive: true } },
  { $lookup: { from: "departments", localField: "department", foreignField: "_id", as: "dept" } },
  { $project: { username: 1, role: 1, dept: "$dept.name" } }
]).pretty()

// See all departments and their heads with staff count
db.departments.aggregate([
  { $lookup: { from: "users", localField: "head", foreignField: "_id", as: "headInfo" } },
  { $lookup: { from: "users", localField: "_id", foreignField: "department", as: "staff" } },
  { $project: { 
      name: 1, 
      head: { $arrayElemAt: ["$headInfo.profile.firstName", 0] },
      staffCount: { $size: "$staff" }
    }
  }
]).pretty()
```

---

## ✨ Benefits After Migration

- ✅ All staff properly organized by department
- ✅ Clear management hierarchy with department heads
- ✅ Automatic incident routing to responsible heads
- ✅ Improved RBAC and security
- ✅ Better operational visibility
- ✅ Compliance with organizational structure

---

## 📞 FAQ

**Q: Can I run the script multiple times?**
A: Yes! It's idempotent and safe to run repeatedly.

**Q: What if a user has no department assigned?**
A: They'll get one based on their role automatically.

**Q: What about admin users?**
A: Admin users are excluded - they don't need department assignment.

**Q: Can I customize the mappings?**
A: Yes! Edit the script constants before running.

**Q: How long does it take?**
A: Typically 2-5 minutes depending on database size.

**Q: What if migration fails?**
A: Check the error message, review troubleshooting section, and try again.

**Q: Do I need to restart the backend?**
A: No, but you can for a fresh start if you want.

---

## 📅 Migration Execution Template

**Date:** ___________
**Executed by:** ___________
**Database:** ___________

**Start time:** ___________
**End time:** ___________
**Duration:** ___________

**Results:**
- Users processed: ___________
- Departments assigned: ___________
- Department heads set: ___________
- Total staff assigned: ___________
- Unassigned users: ___________

**Issues encountered:** ___________

**Customizations made:** ___________

**Sign-off:** ___________

---

**Created:** January 24, 2026
**Version:** 1.0
**Status:** Ready to Deploy

For any questions, refer to the individual documentation files in `/scripts/` directory.
