/**
 * Master Data Routes
 * Admin-only routes for configuring hospital operational skeleton
 * 
 * All routes require: authenticate + authorize('admin')
 * All modifications are audit logged
 */

const express = require('express');
const router = express.Router();
const masterdataController = require('../controllers/masterdata.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, auditAdminAction } = require('../middleware/rbac.middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

router.use(authenticate);
router.use(authorize('admin'));

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router
    .route('/departments')
    .get(masterdataController.getDepartments)
    .post(
        auditAdminAction('DEPARTMENT_CREATE', 'Department'),
        masterdataController.createDepartment
    );

router
    .route('/departments/:id')
    .put(
        auditAdminAction('DEPARTMENT_UPDATE', 'Department'),
        masterdataController.updateDepartment
    )
    .delete(
        auditAdminAction('DEPARTMENT_DEACTIVATE', 'Department'),
        masterdataController.deactivateDepartment
    );

// ═══════════════════════════════════════════════════════════════════════════════
// WARD ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router
    .route('/wards')
    .get(masterdataController.getWards)
    .post(
        auditAdminAction('WARD_CREATE', 'Ward'),
        masterdataController.createWard
    );

router
    .route('/wards/:id')
    .put(
        auditAdminAction('WARD_UPDATE', 'Ward'),
        masterdataController.updateWard
    )
    .delete(
        auditAdminAction('WARD_DEACTIVATE', 'Ward'),
        masterdataController.deactivateWard
    );

// ═══════════════════════════════════════════════════════════════════════════════
// BED ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router
    .route('/beds')
    .get(masterdataController.getBeds)
    .post(
        auditAdminAction('BED_CREATE', 'Bed'),
        masterdataController.createBed
    );

router.post(
    '/beds/bulk',
    auditAdminAction('BED_BULK_CREATE', 'Bed'),
    masterdataController.bulkCreateBeds
);

router
    .route('/beds/:id')
    .put(
        auditAdminAction('BED_UPDATE', 'Bed'),
        masterdataController.updateBed
    );

router.put(
    '/beds/:id/maintenance',
    auditAdminAction('BED_MAINTENANCE', 'Bed'),
    masterdataController.setBedMaintenance
);

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFF ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router
    .route('/tariffs')
    .get(masterdataController.getTariffs)
    .post(
        auditAdminAction('TARIFF_CREATE', 'Tariff'),
        masterdataController.createTariff
    );

router
    .route('/tariffs/:id')
    .put(
        auditAdminAction('TARIFF_UPDATE', 'Tariff'),
        masterdataController.updateTariff
    )
    .delete(
        auditAdminAction('TARIFF_DEACTIVATE', 'Tariff'),
        masterdataController.deactivateTariff
    );

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER SET ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router
    .route('/order-sets')
    .get(masterdataController.getOrderSets)
    .post(
        auditAdminAction('ORDERSET_CREATE', 'OrderSet'),
        masterdataController.createOrderSet
    );

router
    .route('/order-sets/:id')
    .put(
        auditAdminAction('ORDERSET_UPDATE', 'OrderSet'),
        masterdataController.updateOrderSet
    )
    .delete(
        auditAdminAction('ORDERSET_DEACTIVATE', 'OrderSet'),
        masterdataController.deactivateOrderSet
    );

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL VALUE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router
    .route('/critical-values')
    .get(masterdataController.getCriticalValues)
    .post(
        auditAdminAction('CRITICALVALUE_CREATE', 'CriticalValue'),
        masterdataController.createCriticalValue
    );

router
    .route('/critical-values/:id')
    .put(
        auditAdminAction('CRITICALVALUE_UPDATE', 'CriticalValue'),
        masterdataController.updateCriticalValue
    )
    .delete(
        auditAdminAction('CRITICALVALUE_DEACTIVATE', 'CriticalValue'),
        masterdataController.deactivateCriticalValue
    );

// ═══════════════════════════════════════════════════════════════════════════════
// DRUG INTERACTION ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

router
    .route('/drug-interactions')
    .get(masterdataController.getDrugInteractions)
    .post(
        auditAdminAction('DRUGINTERACTION_CREATE', 'DrugInteraction'),
        masterdataController.createDrugInteraction
    );

router
    .route('/drug-interactions/:id')
    .put(
        auditAdminAction('DRUGINTERACTION_UPDATE', 'DrugInteraction'),
        masterdataController.updateDrugInteraction
    )
    .delete(
        auditAdminAction('DRUGINTERACTION_DEACTIVATE', 'DrugInteraction'),
        masterdataController.deactivateDrugInteraction
    );

module.exports = router;
