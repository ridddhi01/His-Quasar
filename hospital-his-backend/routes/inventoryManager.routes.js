/**
 * Inventory Manager Routes
 * All routes protected for INVENTORY_MANAGER role only
 * Handles non-medicine inventory operations
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryManager.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { USER_ROLES } = require('../config/constants');

// All routes require authentication and Inventory Manager role
router.use(authenticate);
router.use(authorize(USER_ROLES.INVENTORY_MANAGER));

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
router.get('/dashboard', controller.getDashboard);

// ═══════════════════════════════════════════════════════════════════
// INVENTORY ITEMS (MASTER)
// ═══════════════════════════════════════════════════════════════════
router.get('/items', controller.getItems);
router.get('/items/:id', controller.getItem);
router.post('/items', controller.createItem);
router.put('/items/:id', controller.updateItem);
router.put('/items/:id/deactivate', controller.deactivateItem);
router.get('/items/:id/audit-log', controller.getItemAuditLog);

// ═══════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════
router.get('/categories', controller.getCategories);
router.post('/categories', controller.createCategory);
router.put('/categories/:id', controller.updateCategory);

// ═══════════════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════════════
router.get('/locations', controller.getLocations);
router.post('/locations', controller.createLocation);
router.put('/locations/:id', controller.updateLocation);

// ═══════════════════════════════════════════════════════════════════
// VENDORS
// ═══════════════════════════════════════════════════════════════════
router.get('/vendors', controller.getVendors);
router.get('/vendors/:id', controller.getVendor);
router.post('/vendors', controller.createVendor);
router.put('/vendors/:id', controller.updateVendor);

// ═══════════════════════════════════════════════════════════════════
// PURCHASE REQUISITIONS
// ═══════════════════════════════════════════════════════════════════
router.get('/purchase-requisitions', controller.getPurchaseRequisitions);
router.post('/purchase-requisitions', controller.createPurchaseRequisition);
router.put('/purchase-requisitions/:id/approve', controller.approvePurchaseRequisition);
router.put('/purchase-requisitions/:id/reject', controller.rejectPurchaseRequisition);

// ═══════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════
router.get('/purchase-orders', controller.getPurchaseOrders);
router.get('/purchase-orders/:id', controller.getPurchaseOrder);
router.post('/purchase-orders', controller.createPurchaseOrder);
router.put('/purchase-orders/:id/approve', controller.approvePurchaseOrder);
router.put('/purchase-orders/:id/cancel', controller.cancelPurchaseOrder);

// ═══════════════════════════════════════════════════════════════════
// GRN (GOODS RECEIPT)
// ═══════════════════════════════════════════════════════════════════
router.get('/grns', controller.getGRNs);
router.post('/grns', controller.createGRN);

// ═══════════════════════════════════════════════════════════════════
// STOCK MONITORING
// ═══════════════════════════════════════════════════════════════════
router.get('/stock/levels', controller.getStockLevels);
router.get('/stock/low-stock', controller.getLowStockItems);
router.get('/stock/near-expiry', controller.getNearExpiryItems);
router.get('/stock/expired', controller.getExpiredItems);
router.get('/stock/slow-moving', controller.getSlowMovingItems);
router.get('/stock/dead-stock', controller.getDeadStock);
router.get('/stock/movement/:itemId', controller.getStockMovementHistory);
router.put('/stock/:stockId/block', controller.blockStock);
router.put('/stock/:stockId/unblock', controller.unblockStock);

// ═══════════════════════════════════════════════════════════════════
// STOCK ISSUE
// ═══════════════════════════════════════════════════════════════════
router.get('/stock-issues', controller.getStockIssues);
router.post('/stock-issues', controller.createStockIssue);
router.put('/stock-issues/:id/approve', controller.approveStockIssue);
router.put('/stock-issues/:id/process', controller.processStockIssue);

// ═══════════════════════════════════════════════════════════════════
// STOCK RETURN
// ═══════════════════════════════════════════════════════════════════
router.get('/stock-returns', controller.getStockReturns);
router.post('/stock-returns', controller.createStockReturn);
router.put('/stock-returns/:id/process', controller.processStockReturn);

// ═══════════════════════════════════════════════════════════════════
// STOCK TRANSFER
// ═══════════════════════════════════════════════════════════════════
router.get('/stock-transfers', controller.getStockTransfers);
router.post('/stock-transfers', controller.createStockTransfer);
router.put('/stock-transfers/:id/approve', controller.approveStockTransfer);
router.put('/stock-transfers/:id/dispatch', controller.dispatchStockTransfer);
router.put('/stock-transfers/:id/receive', controller.receiveStockTransfer);

// ═══════════════════════════════════════════════════════════════════
// RECALLS
// ═══════════════════════════════════════════════════════════════════
router.get('/recalls', controller.getRecalls);
router.post('/recalls', controller.createRecall);
router.put('/recalls/:id/progress', controller.updateRecallProgress);

module.exports = router;
