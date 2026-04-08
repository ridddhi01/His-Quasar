# Quick Start: User Department Assignment

## Run the Migration

From the `hospital-his-backend` directory, execute:

```bash
node scripts/assignUsersToDepartments.js
```

## What Happens

The script will:

1. ✅ Connect to your MongoDB database
2. ✅ Process all Staff records and link users to their departments
3. ✅ Identify and assign department heads based on designation
4. ✅ Assign unassigned users based on their role
5. ✅ Generate a summary report showing:
   - All departments and their heads
   - Total staff count per department
   - Any users that couldn't be auto-assigned

## Expected Results

After running the script, you should see:

- All Staff members connected to the correct department
- Department heads properly designated
- A clear summary table showing department assignments
- Zero or minimal unassigned users (except admins who don't belong to departments)

## Key Features

- **Safe to run multiple times** - Won't cause duplicates
- **Auto-detects heads** from designation keywords (HOD, Head, Director, etc.)
- **Role-based fallback** - Assigns users based on role if no explicit assignment exists
- **Detailed logging** - Shows exactly what was done

## If You Need to Customize

Edit `scripts/assignUsersToDepartments.js` to modify:
- `DEPARTMENT_HEAD_DESIGNATIONS` - Add more head designation keywords
- `ROLE_DEPARTMENT_MAPPING` - Change default department for each role

## Next Steps

After running this script:
1. Verify the output report looks correct
2. Check the incident.controller.js which now requires `req.user.department`
3. All incident reports will now properly enforce department assignment

---

**For detailed documentation, see:** `scripts/MIGRATION_README.md`
