# Admin Permissions & Scopes

This document outlines the strict permission boundaries for the Admin role, distinguishing between Governance (Allowed) and Clinical (Denied) actions.

## ✅ Allowed: Governance & Oversight

| Module | Scope | Description |
|--------|-------|-------------|
| **User Management** | `admin:users:*` | Create, read, update, delete users; Manage roles; Reset passwords. |
| **Master Data** | `admin:master:*` | Configure Departments, Wards, Beds, Tariffs, Insurance, Order Sets. |
| **Audit Logs** | `admin:audit-logs:read` | View-only access to system-wide audit trails. |
| **Billing Oversight** | `admin:billing:read`, `admin:ai-anomalies:*` | View billing data & Manage AI anomalies (No direct bill editing). |
| **Break-Glass** | `admin:breakglass:*` | Grant emergency access; Review break-glass sessions; Revoke access. |
| **Compliance** | `admin:compliance:*` | View compliance dashboards; Track incidents. |
| **System Config** | `admin:system:*` | Manage backup, system health, and global settings. |

## 🚫 Denied: Clinical & Workflows

| Module | Excluded Scope | Why? |
|--------|----------------|------|
| **EMR** | `clinical:emr:*` | Admins cannot view or edit patient medical records. |
| **Prescriptions** | `clinical:prescriptions:*` | Only doctors can prescribe medication. |
| **Lab/Radiology** | `clinical:lab:*`, `clinical:radiology:*` | Admins cannot order tests or enter results. |
| **Nursing** | `nursing:*` | Admins cannot administer meds or complete clinical tasks. |
| **Doctor Workflows** | `workflow:surgery:*`, `workflow:rounds:*` | Clinical decision-making is restricted to medical staff. |

## 🛡️ Middleware Implementation

### 1. Frontend Route Guard (`ClinicalGuard`)
Strictly redirects `role: admin` away from `/dashboard/*` to `/admin`.

```javascript
// src/components/guards/ClinicalGuard.jsx
if (role === 'admin') {
    return <Navigate to="/admin" replace />;
}
```

### 2. Backend Permission Check (`requireScope`)
Enforces granular permission checks on API endpoints.

```javascript
// Example: Creating a user (ALLOWED)
router.post('/', authorize('admin'), requireScope('admin:users:create'), createUser);

// Example: Entering Lab Results (BLOCKED)
// Even if an Admin calls this API, 'denyAdminClinical' middleware blocks it.
```

### 3. Backend Global Safety Net (`denyAdminClinical`)
Middleware applied to all clinical routes to reject Admin write operations.

```javascript
// src/middleware/rbac.middleware.js
if (req.user.role === 'admin' && isRouteBlockedForAdmin(req.path, req.method)) {
    return next(new ErrorResponse('Clinical actions restricted for Admin role', 403));
}
```

## 🔒 API-Level Permission Scopes

These scopes are defined in `config/permissions.config.js` and used throughout the backend.

### User & Role Management
*   `admin:users:create`
*   `admin:users:read`
*   `admin:users:update`
*   `admin:users:delete`
*   `admin:roles:manage`

### Master Data Configuration
*   `admin:departments:*`
*   `admin:wards:*`
*   `admin:tariffs:*`
*   `admin:order-sets:*`
*   `admin:drug-rules:configure`

### Audit & Governance
*   `admin:audit-logs:read`
*   `admin:breakglass-logs:read`
*   `admin:incidents:read`

### Revenue Oversight
*   `admin:billing:read`
*   `admin:ai-anomalies:read`
*   `admin:ai-anomalies:review`
