# User Department Assignment Migration

This script automates the assignment of all internal staff to their respective departments, including setting department heads.

## What the Script Does

1. **Associates Staff with Departments**: Links all users to departments based on their Staff records
2. **Sets Department Heads**: Identifies staff with head/director designations and assigns them as department heads
3. **Role-Based Assignment**: For users without explicit Staff records, assigns them to departments based on their role
4. **Generates Summary Report**: Provides a detailed report of all departments and their staff assignments

## Prerequisites

- Node.js environment is running
- MongoDB database is accessible
- All environment variables (`.env`) are properly configured
- User, Department, and Staff models are populated with data

## Running the Script

### Option 1: Direct Node Execution
```bash
cd hospital-his-backend
node scripts/assignUsersToDepartments.js
```

### Option 2: Using npm (if configured in package.json)
Add this to `package.json` scripts:
```json
"scripts": {
  "migrate:assign-users": "node scripts/assignUsersToDepartments.js"
}
```

Then run:
```bash
npm run migrate:assign-users
```

## What Gets Assigned

### Department Heads
The script identifies department heads based on these designation keywords:
- "head"
- "head of department"
- "hod"
- "director"
- "chief"
- "superintendent"
- "senior consultant"

### Role-Based Department Mapping
If a user doesn't have an explicit department assignment:
- **Doctor** → OPD
- **Nurse / Head Nurse** → Nursing
- **Lab Tech** → Laboratory
- **Radiologist** → Radiology
- **Pharmacist** → Pharmacy
- **Receptionist** → Administration
- **Billing / Insurance** → Finance
- **Inventory Manager** → Inventory
- **Coder / Senior Coder** → Medical Coding

## Output

The script provides:
1. **Progress indicators** showing each step
2. **Department summary table** with:
   - Department name
   - Assigned head
   - Total staff count
3. **Final statistics** including:
   - Total staff assigned to departments
   - Admin users (not assigned to departments)
   - Any remaining unassigned users

## Example Output

```
✓ Connected to MongoDB

🔄 Starting User-to-Department Assignment...

Step 1: Processing Staff records...
✓ Processed 150 Staff records, updated 120 users

Step 2: Assigning Department Heads...
  • OPD: Dr. Rajesh Kumar
  • Nursing: Ms. Priya Singh
  • Laboratory: Mr. Amit Patel
  ...
✓ Department heads assigned: 15

Step 3: Assigning unassigned users by role...
  • John Smith (doctor) → General OPD
  • Jane Doe (nurse) → Nursing
  ...
✓ Role-based assignments: 12

Step 4: Generating Summary Report...

📊 Department Summary:
────────────────────────────────────────────────────
OPD                            | Head: Dr. Rajesh Kumar   | Staff: 25
Nursing                        | Head: Ms. Priya Singh    | Staff: 18
...
────────────────────────────────────────────────────

✓ Total Staff Assigned: 280
✓ Admin Users (no dept): 5
⚠ Unassigned Users: 0

✅ User-to-Department assignment completed successfully!
```

## Troubleshooting

### Script Fails to Connect to Database
- Verify MongoDB is running
- Check `.env` file for correct `MONGODB_URI` or `DB_URL`
- Ensure database credentials are correct

### No Department Heads Assigned
- Verify Staff records have designations that include head-related keywords
- Check that departments exist in the database

### Users Still Unassigned
- Verify their role exists in `ROLE_DEPARTMENT_MAPPING`
- Check if corresponding department exists in the database
- Create missing departments manually first

## Important Notes

⚠️ **This is a one-time migration script. Run it once to establish initial assignments.**

✅ **It's safe to run multiple times** - it will only update records that need updating

🔄 **After running this script**:
- Users will have the `department` field populated
- Department heads will be set in the `Department.head` field
- Activity will be logged to console

## Manual Fixes

If you need to manually fix assignments after running the script:

### Assign a user to a department (via MongoDB):
```javascript
db.users.updateOne(
  { _id: ObjectId("user-id") },
  { $set: { department: ObjectId("dept-id") } }
)
```

### Set a department head (via MongoDB):
```javascript
db.departments.updateOne(
  { _id: ObjectId("dept-id") },
  { $set: { head: ObjectId("user-id") } }
)
```

## Support

If the script encounters errors:
1. Check the error message for details
2. Verify data integrity in MongoDB
3. Ensure all required models are properly defined
4. Check console output for unassigned users that need manual intervention
