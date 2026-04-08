# Staff Department Assignment - Migration Checklist

## Pre-Migration

- [ ] Verify MongoDB is running and accessible
- [ ] Verify `.env` file contains correct `MONGODB_URI` or `DB_URL`
- [ ] Verify all User records exist in database
- [ ] Verify all Department records exist in database
- [ ] Verify Staff records have correct department references
- [ ] Backup database (optional but recommended)

## Running the Migration

- [ ] Navigate to `hospital-his-backend` directory
- [ ] Run: `node scripts/assignUsersToDepartments.js`
- [ ] Wait for script to complete
- [ ] Review console output for any errors
- [ ] Take screenshot/copy the summary report

## Post-Migration Validation

- [ ] Check summary report shows expected number of departments
- [ ] Verify all department heads are assigned
- [ ] Confirm total staff count matches expectations
- [ ] Check unassigned users count (should be 0 or only admins)
- [ ] Query sample users to confirm department field is populated

### MongoDB Quick Checks

```javascript
// Check a random user has department
db.users.findOne({ isActive: true, role: { $ne: "admin" } })

// Count users with departments
db.users.countDocuments({ department: { $exists: true, $ne: null } })

// Count departments with heads
db.departments.countDocuments({ head: { $exists: true, $ne: null } })

// List all departments and their heads
db.departments.find({}, { name: 1, head: 1 }).pretty()
```

## Integration Testing

- [ ] Test creating incident as a regular staff member
- [ ] Verify incident auto-assigns to department head
- [ ] Check incident controller properly validates department
- [ ] Test getting incidents by department for heads
- [ ] Verify RBAC is working correctly

## Troubleshooting

If any issues occur:

- [ ] Check error message in console output
- [ ] Verify MongoDB connection
- [ ] Verify Staff records have correct structure
- [ ] Verify Department records have correct structure
- [ ] Check if roles exist in constants
- [ ] Review MIGRATION_README.md troubleshooting section

## Document Updates

- [ ] Update team documentation with new flow
- [ ] Notify team members of migration completion
- [ ] Share RUN_MIGRATION.md as reference
- [ ] Document any custom role mappings used

## Final Sign-Off

- [ ] Migration completed successfully
- [ ] All validations passed
- [ ] Team notified
- [ ] Documentation updated
- [ ] Date completed: ___________
- [ ] Completed by: ___________

---

## Notes

Use this space to record any issues, customizations, or special notes during the migration:

```

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

```

---

## Rollback Plan (if needed)

If you need to rollback the migration:

1. Restore from backup (if available)
2. Or manually update affected records:
   ```javascript
   // Remove department assignments for specific users
   db.users.updateMany(
     { role: { $ne: "admin" } },
     { $unset: { department: "" } }
   )
   
   // Remove department heads
   db.departments.updateMany(
     {},
     { $unset: { head: "" } }
   )
   ```

---

**Created:** January 24, 2026
**Last Updated:** January 24, 2026
