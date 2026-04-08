/**
 * Inventory Manager Controller
 * Handles all non-medicine inventory API endpoints
 * Restricted to INVENTORY_MANAGER role only
 */

const InventoryItem = require('../models/InventoryItem');
const InventoryStock = require('../models/InventoryStock');
const InventoryCategory = require('../models/InventoryCategory');
const Location = require('../models/Location');
const VendorMaster = require('../models/VendorMaster');
const PurchaseRequisition = require('../models/PurchaseRequisition');
const PurchaseOrder = require('../models/PurchaseOrder');
const GRN = require('../models/GRN');
const StockIssue = require('../models/StockIssue');
const StockReturn = require('../models/StockReturn');
const StockTransfer = require('../models/StockTransfer');
const InventoryRecall = require('../models/InventoryRecall');
const InventoryManagerService = require('../services/inventoryManager.service');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const AuditLog = require('../models/AuditLog');
const {
    PURCHASE_ORDER_STATUS,
    PURCHASE_REQUISITION_STATUS,
    STOCK_ISSUE_STATUS,
    STOCK_TRANSFER_STATUS,
    STOCK_RETURN_STATUS,
    INVENTORY_RECALL_STATUS
} = require('../config/constants');

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

exports.getDashboard = asyncHandler(async (req, res, next) => {
    const { locationId } = req.query;
    const summary = await InventoryManagerService.getDashboardSummary(locationId);
    res.status(200).json({ success: true, data: summary });
});

// ═══════════════════════════════════════════════════════════════════
// INVENTORY ITEMS (MASTER)
// ═══════════════════════════════════════════════════════════════════

exports.getItems = asyncHandler(async (req, res, next) => {
    const { category, status, isActive, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
        query.$or = [
            { itemCode: { $regex: search, $options: 'i' } },
            { itemName: { $regex: search, $options: 'i' } }
        ];
    }

    const items = await InventoryItem.find(query)
        .populate('category', 'categoryName')
        .populate('subCategory', 'categoryName')
        .populate('defaultLocation', 'locationName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ itemName: 1 });

    const total = await InventoryItem.countDocuments(query);

    res.status(200).json({
        success: true,
        data: items,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.getItem = asyncHandler(async (req, res, next) => {
    const item = await InventoryItem.findById(req.params.id)
        .populate('category', 'categoryName categoryCode')
        .populate('subCategory', 'categoryName categoryCode')
        .populate('defaultLocation', 'locationName locationCode')
        .populate('changeHistory.changedBy', 'profile.firstName profile.lastName');

    if (!item) {
        return next(new ErrorResponse('Item not found', 404));
    }

    res.status(200).json({ success: true, data: item });
});

exports.createItem = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    const item = await InventoryItem.create(req.body);

    await AuditLog.create({
        user: req.user._id,
        action: 'create',
        entity: 'InventoryItem',
        entityId: item._id,
        description: `Created inventory item: ${item.itemCode} - ${item.itemName}`,
        ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: item });
});

exports.updateItem = asyncHandler(async (req, res, next) => {
    let item = await InventoryItem.findById(req.params.id);
    if (!item) {
        return next(new ErrorResponse('Item not found', 404));
    }

    // Store previous values for audit
    item._previousValues = item.toObject();
    item._modifiedBy = req.user._id;
    item._modificationReason = req.body.reason || 'Update';

    Object.assign(item, req.body);
    await item.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'update',
        entity: 'InventoryItem',
        entityId: item._id,
        description: 'Updated inventory item',
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: item });
});

exports.deactivateItem = asyncHandler(async (req, res, next) => {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
        return next(new ErrorResponse('Item not found', 404));
    }

    item.isActive = false;
    item.deactivatedAt = new Date();
    item.deactivatedBy = req.user._id;
    item.deactivationReason = req.body.reason;
    await item.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'delete',
        entity: 'InventoryItem',
        entityId: item._id,
        description: `Deactivated item: ${req.body.reason}`,
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: item });
});

exports.getItemAuditLog = asyncHandler(async (req, res, next) => {
    const item = await InventoryItem.findById(req.params.id)
        .select('changeHistory')
        .populate('changeHistory.changedBy', 'profile.firstName profile.lastName');

    if (!item) {
        return next(new ErrorResponse('Item not found', 404));
    }

    res.status(200).json({ success: true, data: item.changeHistory });
});

// ═══════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════

exports.getCategories = asyncHandler(async (req, res, next) => {
    const categories = await InventoryCategory.find({ isActive: true })
        .populate('parentCategory', 'categoryName')
        .sort({ categoryName: 1 });

    res.status(200).json({ success: true, data: categories });
});

exports.createCategory = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    const category = await InventoryCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
});

exports.updateCategory = asyncHandler(async (req, res, next) => {
    const category = await InventoryCategory.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!category) {
        return next(new ErrorResponse('Category not found', 404));
    }
    res.status(200).json({ success: true, data: category });
});

// ═══════════════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════════════

exports.getLocations = asyncHandler(async (req, res, next) => {
    const locations = await Location.find({ isActive: true })
        .populate('parentLocation', 'locationName')
        .populate('department', 'name')
        .sort({ locationName: 1 });

    res.status(200).json({ success: true, data: locations });
});

exports.createLocation = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    const location = await Location.create(req.body);
    res.status(201).json({ success: true, data: location });
});

exports.updateLocation = asyncHandler(async (req, res, next) => {
    const location = await Location.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!location) {
        return next(new ErrorResponse('Location not found', 404));
    }
    res.status(200).json({ success: true, data: location });
});

// ═══════════════════════════════════════════════════════════════════
// VENDORS
// ═══════════════════════════════════════════════════════════════════

exports.getVendors = asyncHandler(async (req, res, next) => {
    const { isActive, vendorType, search } = req.query;
    const query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (vendorType) query.vendorType = vendorType;
    if (search) {
        query.$or = [
            { vendorCode: { $regex: search, $options: 'i' } },
            { vendorName: { $regex: search, $options: 'i' } }
        ];
    }

    const vendors = await VendorMaster.find(query).sort({ vendorName: 1 });
    res.status(200).json({ success: true, data: vendors });
});

exports.getVendor = asyncHandler(async (req, res, next) => {
    const vendor = await VendorMaster.findById(req.params.id);
    if (!vendor) {
        return next(new ErrorResponse('Vendor not found', 404));
    }
    res.status(200).json({ success: true, data: vendor });
});

exports.createVendor = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    const vendor = await VendorMaster.create(req.body);
    res.status(201).json({ success: true, data: vendor });
});

exports.updateVendor = asyncHandler(async (req, res, next) => {
    const vendor = await VendorMaster.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!vendor) {
        return next(new ErrorResponse('Vendor not found', 404));
    }
    res.status(200).json({ success: true, data: vendor });
});

// ═══════════════════════════════════════════════════════════════════
// PURCHASE REQUISITIONS
// ═══════════════════════════════════════════════════════════════════

exports.getPurchaseRequisitions = asyncHandler(async (req, res, next) => {
    const { status, department, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (department) query.requestingDepartment = department;

    const prs = await PurchaseRequisition.find(query)
        .populate('requestingDepartment', 'name')
        .populate('requestingLocation', 'locationName')
        .populate('items.item', 'itemCode itemName')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await PurchaseRequisition.countDocuments(query);

    res.status(200).json({
        success: true,
        data: prs,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.createPurchaseRequisition = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    const pr = await PurchaseRequisition.create(req.body);
    res.status(201).json({ success: true, data: pr });
});

exports.approvePurchaseRequisition = asyncHandler(async (req, res, next) => {
    const pr = await PurchaseRequisition.findById(req.params.id);
    if (!pr) {
        return next(new ErrorResponse('Purchase Requisition not found', 404));
    }

    pr.status = PURCHASE_REQUISITION_STATUS.APPROVED;
    pr.approvedBy = req.user._id;
    pr.approvedAt = new Date();
    await pr.save();

    res.status(200).json({ success: true, data: pr });
});

exports.rejectPurchaseRequisition = asyncHandler(async (req, res, next) => {
    const pr = await PurchaseRequisition.findById(req.params.id);
    if (!pr) {
        return next(new ErrorResponse('Purchase Requisition not found', 404));
    }

    pr.status = PURCHASE_REQUISITION_STATUS.REJECTED;
    pr.rejectedBy = req.user._id;
    pr.rejectedAt = new Date();
    pr.rejectionReason = req.body.reason;
    await pr.save();

    res.status(200).json({ success: true, data: pr });
});

// ═══════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════

exports.getPurchaseOrders = asyncHandler(async (req, res, next) => {
    const { status, vendor, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (vendor) query.vendor = vendor;

    const pos = await PurchaseOrder.find(query)
        .populate('vendor', 'vendorCode vendorName')
        .populate('deliveryLocation', 'locationName')
        .populate('items.item', 'itemCode itemName')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await PurchaseOrder.countDocuments(query);

    res.status(200).json({
        success: true,
        data: pos,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.getPurchaseOrder = asyncHandler(async (req, res, next) => {
    const po = await PurchaseOrder.findById(req.params.id)
        .populate('vendor')
        .populate('deliveryLocation')
        .populate('items.item')
        .populate('createdBy', 'profile.firstName profile.lastName')
        .populate('approvedBy', 'profile.firstName profile.lastName');

    if (!po) {
        return next(new ErrorResponse('Purchase Order not found', 404));
    }

    res.status(200).json({ success: true, data: po });
});

exports.createPurchaseOrder = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    const po = await PurchaseOrder.create(req.body);

    // Link to PR if applicable
    if (req.body.purchaseRequisition) {
        await PurchaseRequisition.findByIdAndUpdate(
            req.body.purchaseRequisition,
            { status: PURCHASE_REQUISITION_STATUS.CONVERTED, linkedPurchaseOrder: po._id }
        );
    }

    await AuditLog.create({
        user: req.user._id,
        action: 'create',
        entity: 'PurchaseOrder',
        entityId: po._id,
        description: `Created PO: ${po.poNumber}`,
        ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: po });
});

exports.approvePurchaseOrder = asyncHandler(async (req, res, next) => {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
        return next(new ErrorResponse('Purchase Order not found', 404));
    }

    // Allow approving DRAFT or PENDING POs
    if (po.status !== PURCHASE_ORDER_STATUS.PENDING && po.status !== PURCHASE_ORDER_STATUS.DRAFT) {
        return next(new ErrorResponse('Only draft or pending POs can be approved', 400));
    }

    po.status = PURCHASE_ORDER_STATUS.APPROVED;
    po.approvedBy = req.user._id;
    po.approvedAt = new Date();
    po.auditTrail.push({
        action: 'APPROVED',
        performedBy: req.user._id,
        details: {}
    });
    await po.save();

    res.status(200).json({ success: true, data: po });
});

exports.cancelPurchaseOrder = asyncHandler(async (req, res, next) => {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
        return next(new ErrorResponse('Purchase Order not found', 404));
    }

    if ([PURCHASE_ORDER_STATUS.CLOSED, PURCHASE_ORDER_STATUS.CANCELLED].includes(po.status)) {
        return next(new ErrorResponse('Cannot cancel a closed or already cancelled PO', 400));
    }

    // Check if any GRN exists
    const grnCount = await GRN.countDocuments({ purchaseOrder: po._id });
    if (grnCount > 0) {
        return next(new ErrorResponse('Cannot cancel PO with existing receipts', 400));
    }

    po.status = PURCHASE_ORDER_STATUS.CANCELLED;
    po.cancelledBy = req.user._id;
    po.cancelledAt = new Date();
    po.cancellationReason = req.body.reason;
    po.auditTrail.push({
        action: 'CANCELLED',
        performedBy: req.user._id,
        details: { reason: req.body.reason }
    });
    await po.save();

    res.status(200).json({ success: true, data: po });
});

// ═══════════════════════════════════════════════════════════════════
// GRN (GOODS RECEIPT)
// ═══════════════════════════════════════════════════════════════════

exports.getGRNs = asyncHandler(async (req, res, next) => {
    const { purchaseOrder, vendor, page = 1, limit = 20 } = req.query;
    const query = {};

    if (purchaseOrder) query.purchaseOrder = purchaseOrder;
    if (vendor) query.vendor = vendor;

    const grns = await GRN.find(query)
        .populate('purchaseOrder', 'poNumber')
        .populate('vendor', 'vendorCode vendorName')
        .populate('receivingLocation', 'locationName')
        .populate('receivedBy', 'profile.firstName profile.lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await GRN.countDocuments(query);

    res.status(200).json({
        success: true,
        data: grns,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.createGRN = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    req.body.receivedBy = req.user._id;

    const grn = await GRN.create(req.body);

    // Update PO received quantities
    const po = await PurchaseOrder.findById(req.body.purchaseOrder);
    if (po) {
        for (const grnItem of grn.items) {
            const poItem = po.items.find(i => i.item.toString() === grnItem.item.toString());
            if (poItem) {
                poItem.receivedQuantity = (poItem.receivedQuantity || 0) + grnItem.acceptedQuantity;
            }
        }
        await po.save();
        await InventoryManagerService.updatePOStatusFromGRN(po._id);
    }

    // Update stock
    await InventoryManagerService.updateStockFromGRN(grn, req.user._id);
    grn.stockUpdated = true;
    await grn.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'create',
        entity: 'GRN',
        entityId: grn._id,
        description: `Created GRN: ${grn.grnNumber}`,
        ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: grn });
});

// ═══════════════════════════════════════════════════════════════════
// STOCK MONITORING
// ═══════════════════════════════════════════════════════════════════

exports.getStockLevels = asyncHandler(async (req, res, next) => {
    const { location, item, status } = req.query;
    const stocks = await InventoryManagerService.getStockLevels({ location, item, status });
    res.status(200).json({ success: true, data: stocks });
});

exports.getLowStockItems = asyncHandler(async (req, res, next) => {
    const { location } = req.query;
    const items = await InventoryManagerService.getLowStockItems(location);
    res.status(200).json({ success: true, data: items });
});

exports.getNearExpiryItems = asyncHandler(async (req, res, next) => {
    const { days = 30, location } = req.query;
    const items = await InventoryManagerService.getNearExpiryItems(parseInt(days), location);
    res.status(200).json({ success: true, data: items });
});

exports.getExpiredItems = asyncHandler(async (req, res, next) => {
    const { location } = req.query;
    const items = await InventoryManagerService.getExpiredItems(location);
    res.status(200).json({ success: true, data: items });
});

exports.getSlowMovingItems = asyncHandler(async (req, res, next) => {
    const { days = 90, location } = req.query;
    const items = await InventoryManagerService.getSlowMovingItems(parseInt(days), location);
    res.status(200).json({ success: true, data: items });
});

exports.getDeadStock = asyncHandler(async (req, res, next) => {
    const { days = 180, location } = req.query;
    const items = await InventoryManagerService.getDeadStock(parseInt(days), location);
    res.status(200).json({ success: true, data: items });
});

exports.getStockMovementHistory = asyncHandler(async (req, res, next) => {
    const { startDate, endDate, transactionType, limit } = req.query;
    const history = await InventoryManagerService.getStockMovementHistory(
        req.params.itemId,
        { startDate, endDate, transactionType, limit: parseInt(limit) }
    );
    res.status(200).json({ success: true, data: history });
});

exports.blockStock = asyncHandler(async (req, res, next) => {
    const stock = await InventoryManagerService.blockStock(
        req.params.stockId,
        req.body.reason,
        req.user._id
    );

    await AuditLog.create({
        user: req.user._id,
        action: 'other',
        entity: 'InventoryStock',
        entityId: stock._id,
        description: `Blocked stock: ${req.body.reason}`,
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: stock });
});

exports.unblockStock = asyncHandler(async (req, res, next) => {
    const stock = await InventoryManagerService.unblockStock(req.params.stockId, req.user._id);

    await AuditLog.create({
        user: req.user._id,
        action: 'other',
        entity: 'InventoryStock',
        entityId: stock._id,
        description: 'Unblocked stock',
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: stock });
});

// ═══════════════════════════════════════════════════════════════════
// STOCK ISSUE
// ═══════════════════════════════════════════════════════════════════

exports.getStockIssues = asyncHandler(async (req, res, next) => {
    const { status, department, location, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (department) query.requestingDepartment = department;
    if (location) query.issuingLocation = location;

    const issues = await StockIssue.find(query)
        .populate('requestingDepartment', 'name')
        .populate('issuingLocation', 'locationName')
        .populate('items.item', 'itemCode itemName')
        .populate('requestedBy', 'profile.firstName profile.lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await StockIssue.countDocuments(query);

    res.status(200).json({
        success: true,
        data: issues,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.createStockIssue = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    req.body.requestedBy = req.user._id;
    const issue = await StockIssue.create(req.body);
    res.status(201).json({ success: true, data: issue });
});

exports.approveStockIssue = asyncHandler(async (req, res, next) => {
    const issue = await StockIssue.findById(req.params.id);
    if (!issue) {
        return next(new ErrorResponse('Stock Issue not found', 404));
    }

    // Validate stock availability for all items
    for (const item of issue.items) {
        const validation = await InventoryManagerService.validateStockForIssue(
            item.stock,
            item.approvedQuantity || item.requestedQuantity
        );
        if (!validation.valid) {
            return next(new ErrorResponse(`Item validation failed: ${validation.reason}`, 400));
        }
    }

    issue.status = STOCK_ISSUE_STATUS.APPROVED;
    issue.approvedBy = req.user._id;
    issue.approvedAt = new Date();
    await issue.save();

    res.status(200).json({ success: true, data: issue });
});

exports.processStockIssue = asyncHandler(async (req, res, next) => {
    const issue = await StockIssue.findById(req.params.id);
    if (!issue) {
        return next(new ErrorResponse('Stock Issue not found', 404));
    }

    if (issue.status !== STOCK_ISSUE_STATUS.APPROVED) {
        return next(new ErrorResponse('Only approved issues can be processed', 400));
    }

    await InventoryManagerService.processStockIssue(issue, req.user._id);

    issue.status = STOCK_ISSUE_STATUS.ISSUED;
    issue.issuedBy = req.user._id;
    issue.issuedAt = new Date();
    await issue.save();

    await AuditLog.create({
        user: req.user._id,
        action: 'other',
        entity: 'StockIssue',
        entityId: issue._id,
        description: `Issued stock: ${issue.issueNumber}`,
        ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: issue });
});

// ═══════════════════════════════════════════════════════════════════
// STOCK RETURN
// ═══════════════════════════════════════════════════════════════════

exports.getStockReturns = asyncHandler(async (req, res, next) => {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const returns = await StockReturn.find(query)
        .populate('returningDepartment', 'name')
        .populate('receivingLocation', 'locationName')
        .populate('items.item', 'itemCode itemName')
        .populate('returnedBy', 'profile.firstName profile.lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await StockReturn.countDocuments(query);

    res.status(200).json({
        success: true,
        data: returns,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.createStockReturn = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    req.body.returnedBy = req.user._id;
    const stockReturn = await StockReturn.create(req.body);
    res.status(201).json({ success: true, data: stockReturn });
});

exports.processStockReturn = asyncHandler(async (req, res, next) => {
    const stockReturn = await StockReturn.findById(req.params.id);
    if (!stockReturn) {
        return next(new ErrorResponse('Stock Return not found', 404));
    }

    // Update accepted quantities from request
    if (req.body.items) {
        stockReturn.items = stockReturn.items.map((item, idx) => {
            if (req.body.items[idx]) {
                item.acceptedQuantity = req.body.items[idx].acceptedQuantity || 0;
            }
            return item;
        });
    }

    await InventoryManagerService.processStockReturn(stockReturn, req.user._id);

    stockReturn.status = STOCK_RETURN_STATUS.ACCEPTED;
    stockReturn.processedBy = req.user._id;
    stockReturn.processedAt = new Date();
    stockReturn.stockUpdated = true;
    await stockReturn.save();

    res.status(200).json({ success: true, data: stockReturn });
});

// ═══════════════════════════════════════════════════════════════════
// STOCK TRANSFER
// ═══════════════════════════════════════════════════════════════════

exports.getStockTransfers = asyncHandler(async (req, res, next) => {
    const { status, sourceLocation, destinationLocation, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (sourceLocation) query.sourceLocation = sourceLocation;
    if (destinationLocation) query.destinationLocation = destinationLocation;

    const transfers = await StockTransfer.find(query)
        .populate('sourceLocation', 'locationName')
        .populate('destinationLocation', 'locationName')
        .populate('items.item', 'itemCode itemName')
        .populate('requestedBy', 'profile.firstName profile.lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await StockTransfer.countDocuments(query);

    res.status(200).json({
        success: true,
        data: transfers,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.createStockTransfer = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    req.body.requestedBy = req.user._id;
    const transfer = await StockTransfer.create(req.body);
    res.status(201).json({ success: true, data: transfer });
});

exports.approveStockTransfer = asyncHandler(async (req, res, next) => {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
        return next(new ErrorResponse('Stock Transfer not found', 404));
    }

    transfer.status = STOCK_TRANSFER_STATUS.APPROVED;
    transfer.approvedBy = req.user._id;
    transfer.approvedAt = new Date();
    await transfer.save();

    res.status(200).json({ success: true, data: transfer });
});

exports.dispatchStockTransfer = asyncHandler(async (req, res, next) => {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
        return next(new ErrorResponse('Stock Transfer not found', 404));
    }

    if (transfer.status !== STOCK_TRANSFER_STATUS.APPROVED) {
        return next(new ErrorResponse('Only approved transfers can be dispatched', 400));
    }

    await InventoryManagerService.processStockTransfer(transfer, 'dispatch', req.user._id);

    transfer.status = STOCK_TRANSFER_STATUS.IN_TRANSIT;
    transfer.dispatchedBy = req.user._id;
    transfer.dispatchedAt = new Date();
    transfer.sourceStockUpdated = true;
    await transfer.save();

    res.status(200).json({ success: true, data: transfer });
});

exports.receiveStockTransfer = asyncHandler(async (req, res, next) => {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
        return next(new ErrorResponse('Stock Transfer not found', 404));
    }

    if (transfer.status !== STOCK_TRANSFER_STATUS.IN_TRANSIT) {
        return next(new ErrorResponse('Only in-transit transfers can be received', 400));
    }

    // Update received quantities
    if (req.body.items) {
        transfer.items = transfer.items.map((item, idx) => {
            if (req.body.items[idx]) {
                item.receivedQuantity = req.body.items[idx].receivedQuantity || item.quantity;
            }
            return item;
        });
    }

    await InventoryManagerService.processStockTransfer(transfer, 'receive', req.user._id);

    transfer.status = STOCK_TRANSFER_STATUS.RECEIVED;
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();
    transfer.receivingRemarks = req.body.remarks;
    transfer.destinationStockUpdated = true;
    await transfer.save();

    res.status(200).json({ success: true, data: transfer });
});

// ═══════════════════════════════════════════════════════════════════
// RECALLS
// ═══════════════════════════════════════════════════════════════════

exports.getRecalls = asyncHandler(async (req, res, next) => {
    const { status, item, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (item) query.item = item;

    const recalls = await InventoryRecall.find(query)
        .populate('item', 'itemCode itemName')
        .populate('initiatedBy', 'profile.firstName profile.lastName')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await InventoryRecall.countDocuments(query);

    res.status(200).json({
        success: true,
        data: recalls,
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
});

exports.createRecall = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;
    req.body.initiatedBy = req.user._id;

    // Find affected stock
    const affectedStock = await InventoryManagerService.getRecallAffectedStock(
        req.body.item,
        req.body.batchNumber
    );

    req.body.affectedLocations = affectedStock.map(stock => ({
        location: stock.location._id,
        quantityAffected: stock.quantity,
        status: 'pending'
    }));

    req.body.totalQuantityAffected = affectedStock.reduce((sum, s) => sum + s.quantity, 0);

    const recall = await InventoryRecall.create(req.body);

    // Block affected stock
    for (const stock of affectedStock) {
        await InventoryManagerService.blockStock(stock._id, `Recall: ${recall.recallNumber}`, req.user._id);
    }

    await AuditLog.create({
        user: req.user._id,
        action: 'CREATE_RECALL',
        entity: 'InventoryRecall',
        entityId: recall._id,
        details: { recallNumber: recall.recallNumber, item: recall.item },
        ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: recall });
});

exports.updateRecallProgress = asyncHandler(async (req, res, next) => {
    const recall = await InventoryRecall.findById(req.params.id);
    if (!recall) {
        return next(new ErrorResponse('Recall not found', 404));
    }

    const { locationId, quantityRecalled, status } = req.body;

    const locationEntry = recall.affectedLocations.find(
        l => l.location.toString() === locationId
    );

    if (locationEntry) {
        locationEntry.quantityRecalled = quantityRecalled;
        locationEntry.status = status;
        locationEntry.recalledBy = req.user._id;
        locationEntry.recalledAt = new Date();
    }

    recall.totalQuantityRecalled = recall.affectedLocations.reduce(
        (sum, l) => sum + (l.quantityRecalled || 0), 0
    );

    recall.auditTrail.push({
        action: 'UPDATE_PROGRESS',
        performedBy: req.user._id,
        location: locationId,
        details: { quantityRecalled, status }
    });

    // Check if recall is complete
    const allComplete = recall.affectedLocations.every(l => l.status === 'completed');
    if (allComplete) {
        recall.status = INVENTORY_RECALL_STATUS.COMPLETED;
        recall.completedBy = req.user._id;
        recall.completedAt = new Date();
    } else {
        recall.status = INVENTORY_RECALL_STATUS.IN_PROGRESS;
    }

    await recall.save();

    res.status(200).json({ success: true, data: recall });
});

module.exports = exports;
