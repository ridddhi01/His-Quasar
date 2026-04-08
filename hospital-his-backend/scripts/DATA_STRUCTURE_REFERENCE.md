# Data Structure Reference for Migration

## User Model - After Migration

```javascript
{
  _id: ObjectId("..."),
  username: "dr_rajesh_kumar",
  email: "rajesh@hospital.com",
  role: "doctor",
  
  // ✅ This field will be populated by the migration
  department: ObjectId("dept_opd"),  // Reference to Department
  
  profile: {
    firstName: "Rajesh",
    lastName: "Kumar",
    phone: "9876543210",
    qualification: "MBBS, MD",
    specialization: "General Medicine",
    registrationNumber: "MCI123456",
    employeeId: "EMP001",
    dateOfJoining: Date("2020-01-15")
  },
  
  isActive: true,
  lastLogin: Date("2025-01-24"),
  accountStatus: "active",
  
  createdAt: Date("2020-01-15"),
  updatedAt: Date("2025-01-24")
}
```

## Department Model - After Migration

```javascript
{
  _id: ObjectId("dept_opd"),
  departmentCode: "OPD",
  name: "Out Patient Department",
  type: "clinical",
  
  // ✅ This field will be set by the migration
  head: ObjectId("user_rajesh"),  // Reference to User (department head)
  
  location: {
    building: "Main Building",
    floor: "Ground",
    wing: "East Wing"
  },
  
  contactNumber: "0123-456789",
  email: "opd@hospital.com",
  
  operatingHours: {
    start: "09:00",
    end: "17:00"
  },
  
  isEmergencyAvailable: true,
  consultationFee: 500,
  followupFee: 300,
  description: "General OPD",
  isActive: true,
  
  createdAt: Date("2020-01-01"),
  updatedAt: Date("2025-01-24")
}
```

## Staff Model - Input Data

The Staff model is read by the migration to determine department assignments:

```javascript
{
  _id: ObjectId("staff_001"),
  employeeId: "EMP001",
  
  // Staff.user references the User document
  user: ObjectId("user_rajesh"),
  
  // Staff.department is read to assign User.department
  department: ObjectId("dept_opd"),
  
  designation: "Senior Consultant - OPD",  // ⚠️ If this contains head keywords, they become heads
  employmentType: "permanent",
  joiningDate: Date("2020-01-15"),
  
  reportingTo: ObjectId("staff_002"),  // Department head reference
  
  salary: {
    basic: 100000,
    allowances: 20000,
    deductions: 5000,
    net: 115000
  }
}
```

## Expected Results - Data Flow

```
┌──────────────────────────────────────┐
│   Staff Record                       │
│  ├─ employeeId: "EMP001"            │
│  ├─ user: User ObjectId             │
│  ├─ department: Department ObjectId  │
│  └─ designation: "Senior Consultant"│
└────────┬─────────────────────────────┘
         │
         ↓ Migration reads Staff
┌──────────────────────────────────────┐
│   User Record (Updated)              │
│  ├─ _id: ObjectId                   │
│  ├─ username: "dr_rajesh_kumar"     │
│  ├─ role: "doctor"                  │
│  │
│  └─ department: Department ObjectId  │ ← POPULATED
└────────┬─────────────────────────────┘
         │
         ├─ If designation has "head" keyword
         │  ↓
         └──→ Set as Department.head
              └─ Department.head: User ObjectId
```

## Data Mapping Example

### Example 1: Doctor with Staff Record

**Input (Staff Record):**
```javascript
{
  user: ObjectId("user_rajesh"),
  department: ObjectId("dept_opd"),
  designation: "Senior Consultant - OPD",
  // No "head" keywords in designation
}
```

**Output (After Migration):**
```javascript
// User Collection
{
  _id: ObjectId("user_rajesh"),
  role: "doctor",
  department: ObjectId("dept_opd")  // ← Assigned from Staff
}

// Department Collection
{
  _id: ObjectId("dept_opd"),
  name: "OPD",
  head: // unchanged (no head keyword in designation)
}
```

### Example 2: Doctor with Head Designation

**Input (Staff Record):**
```javascript
{
  user: ObjectId("user_sharma"),
  department: ObjectId("dept_opd"),
  designation: "HOD - Cardiology"  // ← Contains "HOD" keyword!
}
```

**Output (After Migration):**
```javascript
// User Collection
{
  _id: ObjectId("user_sharma"),
  role: "doctor",
  department: ObjectId("dept_cardiology")  // ← From Staff
}

// Department Collection (Cardiology)
{
  _id: ObjectId("dept_cardiology"),
  name: "Cardiology",
  head: ObjectId("user_sharma")  // ← Set as head due to "HOD"
}
```

### Example 3: User Without Staff Record

**Input (User Only):**
```javascript
{
  _id: ObjectId("user_john"),
  role: "nurse",
  department: null  // ← No department assigned
  // No Staff record exists
}
```

**Output (After Migration):**
```javascript
// User Collection
{
  _id: ObjectId("user_john"),
  role: "nurse",
  department: ObjectId("dept_nursing")  // ← Assigned via ROLE_DEPARTMENT_MAPPING
}

// Department (Nursing) unchanged
// john becomes a regular staff member, not a head
```

## Head Designation Keywords

The script detects these keywords (case-insensitive):
- `head`
- `head of department`
- `hod`
- `director`
- `chief`
- `superintendent`
- `senior consultant`

**Examples that will be detected:**
- "HOD - Cardiology" ✅
- "Head of OPD" ✅
- "Senior Consultant and Head" ✅
- "Chief Surgeon" ✅
- "Director of Nursing" ✅

**Examples that won't:**
- "Senior Doctor" ❌
- "Consultant" ❌
- "Staff Nurse" ❌

## Role to Department Mapping

```
Doctor                → OPD
Nurse                 → Nursing
Head Nurse            → Nursing
Lab Tech              → Laboratory
Radiologist           → Radiology
Pharmacist            → Pharmacy
Receptionist          → Administration
Billing               → Finance
Insurance             → Finance
Compliance            → (No auto-mapping)
Inventory Manager     → Inventory
Coder                 → Medical Coding
Senior Coder          → Medical Coding
Admin                 → (No department)
```

## Database Indexes Used by Migration

The script queries these collections with:

```javascript
// Finding users without department
db.users.find({ 
  department: { $exists: false },
  role: { $ne: "admin" }
})

// Finding staff with head designations
db.staff.find({
  designation: /head|hod|director|chief|superintendent|senior consultant/i
}).populate('user').populate('department')

// Finding departments
db.departments.find({ isActive: true })

// Finding users in a department (for summary)
db.users.countDocuments({
  department: ObjectId("dept_id"),
  isActive: true
})
```

## Consistency After Migration

✅ **Expected State:**
- Every non-admin user has a department
- Every department has a head (except unimportant ones)
- User.department matches Staff.department
- No orphaned references
- All active users can create incidents

## Verification Queries

Run these queries to verify migration success:

```javascript
// Check user has department
db.users.findOne({ 
  _id: ObjectId("user_id"),
  department: { $exists: true, $ne: null }
})

// List all heads
db.departments.find(
  { head: { $exists: true, $ne: null } },
  { name: 1, head: 1 }
)

// Count assignments per department
db.users.aggregate([
  { $match: { department: { $exists: true } } },
  { $group: { _id: "$department", count: { $sum: 1 } } },
  { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
  { $unwind: "$dept" },
  { $project: { department: "$dept.name", count: 1 } }
])
```

---

**Created:** January 24, 2026
**Version:** 1.0
