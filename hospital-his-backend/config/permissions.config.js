/**
 * Permission Configuration for Role-Based Access Control
 * Defines granular scopes for each role, especially Admin
 * 
 * Scope Format: 'domain:resource:action'
 * Examples: 'admin:users:create', 'clinical:emr:update'
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PERMISSIONS - Governance Role (Non-Clinical)
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_PERMISSIONS = {
    // ─────────────────────────────────────────────────────────────────────────
    // ALLOWED SCOPES - Configuration & Governance
    // ─────────────────────────────────────────────────────────────────────────

    // User Management
    'admin:users:create': true,
    'admin:users:read': true,
    'admin:users:update': true,
    'admin:users:delete': true,
    'admin:roles:manage': true,

    // Master Data - Infrastructure
    'admin:departments:create': true,
    'admin:departments:read': true,
    'admin:departments:update': true,
    'admin:departments:delete': true,
    'admin:wards:create': true,
    'admin:wards:read': true,
    'admin:wards:update': true,
    'admin:wards:delete': true,
    'admin:beds:configure': true,       // Define beds, NOT allocate to patients

    // Master Data - Financial
    'admin:tariffs:create': true,
    'admin:tariffs:read': true,
    'admin:tariffs:update': true,
    'admin:tariffs:delete': true,
    'admin:insurance-providers:create': true,
    'admin:insurance-providers:read': true,
    'admin:insurance-providers:update': true,
    'admin:tpa-providers:create': true,
    'admin:tpa-providers:read': true,
    'admin:tpa-providers:update': true,
    'admin:vendors:create': true,
    'admin:vendors:read': true,
    'admin:vendors:update': true,

    // Master Data - Clinical Catalogs (NOT patient-specific)
    'admin:medicines-catalog:create': true,
    'admin:medicines-catalog:read': true,
    'admin:medicines-catalog:update': true,
    'admin:lab-master:create': true,
    'admin:lab-master:read': true,
    'admin:lab-master:update': true,
    'admin:radiology-master:create': true,
    'admin:radiology-master:read': true,
    'admin:radiology-master:update': true,
    'admin:order-sets:create': true,
    'admin:order-sets:read': true,
    'admin:order-sets:update': true,

    // System Configuration
    'admin:config:read': true,
    'admin:config:update': true,
    'admin:backup:create': true,
    'admin:backup:restore': true,

    // Clinical Governance Rules (Data entry, not patient decisions)
    'admin:critical-values:configure': true,
    'admin:drug-rules:configure': true,
    'admin:vital-alerts:configure': true,
    'admin:allergy-rules:configure': true,

    // Audit & Compliance (READ-ONLY)
    'admin:audit-logs:read': true,
    'admin:compliance-reports:read': true,
    'admin:incidents:read': true,
    'admin:breakglass-logs:read': true,

    // Financial Oversight (READ + AI Review)
    'admin:billing:read': true,
    'admin:ai-anomalies:read': true,
    'admin:ai-anomalies:review': true,
    'admin:payments:read': true,

    // Analytics (READ-ONLY)
    'admin:analytics:executive': true,
    'admin:analytics:operational': true,
    'admin:analytics:financial': true,
    'admin:analytics:clinical': true,

    // Patient Data Integrity (Limited)
    'admin:patients:read': true,         // Demographics only
    'admin:patients:merge': true,        // Duplicate resolution

    // ─────────────────────────────────────────────────────────────────────────
    // EXPLICITLY DENIED SCOPES - Clinical Actions (NEVER ALLOWED)
    // ─────────────────────────────────────────────────────────────────────────

    // EMR & Clinical Documentation
    'clinical:emr:create': false,
    'clinical:emr:update': false,
    'clinical:prescriptions:create': false,
    'clinical:prescriptions:update': false,
    'clinical:notes:create': false,
    'clinical:notes:update': false,
    'clinical:vitals:create': false,
    'clinical:vitals:update': false,
    'clinical:care-plans:create': false,
    'clinical:care-plans:update': false,

    // Orders
    'clinical:lab:order': false,
    'clinical:lab:results': false,
    'clinical:radiology:order': false,
    'clinical:radiology:report': false,

    // Workflows
    'workflow:appointments:create': false,
    'workflow:admissions:create': false,
    'workflow:admissions:discharge': false,
    'workflow:triage:execute': false,
    'workflow:surgery:schedule': false,

    // Pharmacy
    'pharmacy:dispense:execute': false,
    'pharmacy:administer:execute': false,

    // Nursing
    'nursing:tasks:create': false,
    'nursing:tasks:complete': false,
    'nursing:mar:administer': false,
    'nursing:handover:create': false,

    // Bed Allocation (Clinical action)
    'beds:allocate': false,
    'beds:transfer': false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL ROUTES BLOCKED FOR ADMIN
// List of route prefixes that Admin cannot access for write operations
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_BLOCKED_ROUTES = [
    '/api/emr',
    '/api/prescriptions',
    '/api/nursing/vitals',
    '/api/nursing/notes',
    '/api/nursing/tasks',
    '/api/nursing/care-plans',
    '/api/nursing/medication-administration',
    '/api/lab/orders/*/enter-results',
    '/api/lab/orders/*/validate',
    '/api/radiology/orders/*/enter-report',
    '/api/surgery/*/who-checklist',
    '/api/surgery/*/intra-op-notes',
    '/api/emergency/triage',
    '/api/beds/allocate',
    '/api/beds/transfer',
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if Admin has a specific permission scope
 * @param {string} scope - Permission scope to check
 * @returns {boolean} - True if allowed, false if denied
 */
function checkAdminPermission(scope) {
    // Explicit check - denied scopes return false
    if (ADMIN_PERMISSIONS[scope] === false) {
        return false;
    }

    // Explicit check - allowed scopes return true
    if (ADMIN_PERMISSIONS[scope] === true) {
        return true;
    }

    // Domain-level check (e.g., 'admin:*' would match 'admin:users:create')
    const [domain] = scope.split(':');
    if (domain === 'admin') {
        return true; // Admin domain is generally allowed
    }

    // Clinical domains are denied by default for Admin
    if (['clinical', 'nursing', 'pharmacy', 'workflow'].includes(domain)) {
        return false;
    }

    // Default: deny unknown scopes for security
    return false;
}

/**
 * Check if a route is blocked for Admin
 * @param {string} path - Route path
 * @param {string} method - HTTP method
 * @returns {boolean} - True if blocked
 */
function isRouteBlockedForAdmin(path, method) {
    // GET requests are generally allowed for viewing
    if (method === 'GET') {
        return false;
    }

    // Check blocked routes for write operations
    return ADMIN_BLOCKED_ROUTES.some(blockedRoute => {
        const regex = new RegExp(blockedRoute.replace(/\*/g, '[^/]+'));
        return regex.test(path);
    });
}

module.exports = {
    ADMIN_PERMISSIONS,
    ADMIN_BLOCKED_ROUTES,
    checkAdminPermission,
    isRouteBlockedForAdmin,
};
