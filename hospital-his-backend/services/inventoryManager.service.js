/**
 * Inventory Manager Service
 * Business logic for NON-MEDICINE inventory management operations
 * This is separate from pharmacy/medicine inventory (inventory.service.js)
 * Only accessible by Inventory Manager role
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
const InventoryTransaction = require('../models/InventoryTransaction');
const { INVENTORY_STATUS, PURCHASE_ORDER_STATUS, STOCK_ISSUE_STATUS } = require('../config/constants');

class InventoryManagerService {
    /**
     * Get real-time stock levels for all items or specific location
     */
    static async getStockLevels(filters = {}) {
        const query = {};
        if (filters.location) query.location = filters.location;
        if (filters.item) query.item = filters.item;
        if (filters.status) query.status = filters.status;

        const stocks = await InventoryStock.find(query)
            .populate('item', 'itemCode itemName category uom reorderLevel maxStockLevel')
            .populate('location', 'locationCode locationName')
            .sort({ 'item.itemName': 1 });

        return stocks;
    }

    /**
     * Get stock summary by item across all locations
     */
    static async getStockSummaryByItem(itemId) {
        const stocks = await InventoryStock.aggregate([
            { $match: { item: itemId } },
            {
                $group: {
                    _id: '$item',
                    totalQuantity: { $sum: '$quantity' },
                    totalAvailable: { $sum: '$availableQuantity' },
                    totalReserved: { $sum: '$reservedQuantity' },
                    locationCount: { $addToSet: '$location' },
                    batches: {
                        $push: {
                            batchNumber: '$batchNumber',
                            expiryDate: '$expiryDate',
                            quantity: '$quantity',
                            location: '$location'
                        }
                    }
                }
            }
        ]);

        return stocks[0] || null;
    }

    /**
     * Validate stock for issue (not expired, not blocked)
     */
    static async validateStockForIssue(stockId, quantity) {
        const stock = await InventoryStock.findById(stockId);

        if (!stock) {
            return { valid: false, reason: 'Stock record not found' };
        }

        if (stock.isBlocked) {
            return { valid: false, reason: `Stock is blocked: ${stock.blockReason}` };
        }

        if (stock.status === INVENTORY_STATUS.EXPIRED) {
            return { valid: false, reason: 'Cannot issue expired stock' };
        }

        if (stock.status === INVENTORY_STATUS.QUARANTINED) {
            return { valid: false, reason: 'Cannot issue quarantined stock' };
        }

        if (stock.expiryDate && new Date() > stock.expiryDate) {
            return { valid: false, reason: 'Stock has expired' };
        }

        if (stock.availableQuantity < quantity) {
            return { valid: false, reason: `Insufficient stock. Available: ${stock.availableQuantity}` };
        }

        return { valid: true, stock };
    }

    /**
     * Get near-expiry items (within specified days)
     */
    static async getNearExpiryItems(days = 30, locationId = null) {
        const expiryThreshold = new Date();
        expiryThreshold.setDate(expiryThreshold.getDate() + days);

        const query = {
            expiryDate: { $lte: expiryThreshold, $gt: new Date() },
            quantity: { $gt: 0 },
            isBlocked: false
        };

        if (locationId) query.location = locationId;

        const stocks = await InventoryStock.find(query)
            .populate('item', 'itemCode itemName category')
            .populate('location', 'locationCode locationName')
            .sort({ expiryDate: 1 });

        return stocks;
    }

    /**
     * Get expired items
     */
    static async getExpiredItems(locationId = null) {
        const query = {
            expiryDate: { $lt: new Date() },
            quantity: { $gt: 0 }
        };

        if (locationId) query.location = locationId;

        const stocks = await InventoryStock.find(query)
            .populate('item', 'itemCode itemName category')
            .populate('location', 'locationCode locationName')
            .sort({ expiryDate: 1 });

        return stocks;
    }

    /**
     * Get low stock items (below reorder level)
     */
    static async getLowStockItems(locationId = null) {
        const pipeline = [
            {
                $group: {
                    _id: locationId ? { item: '$item', location: '$location' } : '$item',
                    totalQuantity: { $sum: '$quantity' }
                }
            },
            {
                $lookup: {
                    from: 'inventoryitems',
                    localField: locationId ? '_id.item' : '_id',
                    foreignField: '_id',
                    as: 'itemDetails'
                }
            },
            { $unwind: '$itemDetails' },
            {
                $match: {
                    $expr: { $lt: ['$totalQuantity', '$itemDetails.reorderLevel'] }
                }
            },
            {
                $project: {
                    item: '$itemDetails',
                    totalQuantity: 1,
                    reorderLevel: '$itemDetails.reorderLevel',
                    shortage: { $subtract: ['$itemDetails.reorderLevel', '$totalQuantity'] }
                }
            }
        ];

        if (locationId) {
            pipeline.unshift({ $match: { location: locationId } });
        }

        return await InventoryStock.aggregate(pipeline);
    }

    /**
     * Get slow-moving items (no movement in specified days)
     */
    static async getSlowMovingItems(days = 90, locationId = null) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);

        const query = {
            quantity: { $gt: 0 },
            $or: [
                { lastMovementDate: { $lt: thresholdDate } },
                { lastMovementDate: { $exists: false } }
            ]
        };

        if (locationId) query.location = locationId;

        const stocks = await InventoryStock.find(query)
            .populate('item', 'itemCode itemName category')
            .populate('location', 'locationCode locationName')
            .sort({ lastMovementDate: 1 });

        return stocks;
    }

    /**
     * Get dead stock (no movement in specified days)
     */
    static async getDeadStock(days = 180, locationId = null) {
        return await this.getSlowMovingItems(days, locationId);
    }

    /**
     * Update stock after GRN receipt
     */
    static async updateStockFromGRN(grn, userId) {
        const stockUpdates = [];

        for (const item of grn.items) {
            if (item.acceptedQuantity <= 0) continue;

            const stockData = {
                item: item.item,
                location: item.location || grn.receivingLocation,
                batchNumber: item.batchNumber || null,
                expiryDate: item.expiryDate || null,
                manufacturingDate: item.manufacturingDate || null,
                grn: grn._id,
                purchaseRate: item.rate,
                lastMovementDate: new Date(),
                lastMovementType: 'receipt',
                createdBy: userId
            };

            // Check if stock entry exists
            let stock = await InventoryStock.findOne({
                item: item.item,
                location: stockData.location,
                batchNumber: stockData.batchNumber || { $exists: false }
            });

            if (stock) {
                stock.quantity += item.acceptedQuantity;
                stock.lastMovementDate = new Date();
                stock.lastMovementType = 'receipt';
            } else {
                stock = new InventoryStock({
                    ...stockData,
                    quantity: item.acceptedQuantity
                });
            }

            await stock.save();
            stockUpdates.push(stock);

            // Create transaction record
            await InventoryTransaction.create({
                item: item.item,
                transactionType: 'stock-in',
                quantity: item.acceptedQuantity,
                previousQuantity: stock.quantity - item.acceptedQuantity,
                newQuantity: stock.quantity,
                rate: item.rate,
                totalAmount: item.amount,
                invoiceNumber: grn.invoiceNumber,
                reason: 'GRN Receipt',
                remarks: `GRN: ${grn.grnNumber}`,
                createdBy: userId
            });
        }

        return stockUpdates;
    }

    /**
     * Process stock issue
     */
    static async processStockIssue(stockIssue, userId) {
        for (const item of stockIssue.items) {
            if (item.issuedQuantity <= 0) continue;

            const stock = await InventoryStock.findById(item.stock);
            if (!stock) continue;

            stock.quantity -= item.issuedQuantity;
            stock.lastMovementDate = new Date();
            stock.lastMovementType = 'issue';
            await stock.save();

            await InventoryTransaction.create({
                item: item.item,
                transactionType: 'stock-out',
                quantity: item.issuedQuantity,
                previousQuantity: stock.quantity + item.issuedQuantity,
                newQuantity: stock.quantity,
                rate: item.rate,
                department: stockIssue.requestingDepartment,
                issuedTo: stockIssue.requestedBy,
                reason: 'Stock Issue',
                remarks: `Issue: ${stockIssue.issueNumber}`,
                createdBy: userId
            });
        }
    }

    /**
     * Process stock return
     */
    static async processStockReturn(stockReturn, userId) {
        for (const item of stockReturn.items) {
            if (item.acceptedQuantity <= 0) continue;

            let stock = await InventoryStock.findOne({
                item: item.item,
                location: stockReturn.receivingLocation,
                batchNumber: item.batchNumber || { $exists: false }
            });

            if (!stock) {
                stock = new InventoryStock({
                    item: item.item,
                    location: stockReturn.receivingLocation,
                    batchNumber: item.batchNumber,
                    expiryDate: item.expiryDate,
                    quantity: 0,
                    createdBy: userId
                });
            }

            const previousQty = stock.quantity;
            stock.quantity += item.acceptedQuantity;
            stock.lastMovementDate = new Date();
            stock.lastMovementType = 'return';
            await stock.save();

            await InventoryTransaction.create({
                item: item.item,
                transactionType: 'return',
                quantity: item.acceptedQuantity,
                previousQuantity: previousQty,
                newQuantity: stock.quantity,
                reason: stockReturn.returnReason,
                remarks: `Return: ${stockReturn.returnNumber}`,
                createdBy: userId
            });
        }
    }

    /**
     * Process stock transfer
     */
    static async processStockTransfer(transfer, action, userId) {
        if (action === 'dispatch') {
            // Deduct from source
            for (const item of transfer.items) {
                const stock = await InventoryStock.findById(item.sourceStock);
                if (!stock) continue;

                stock.quantity -= item.quantity;
                stock.lastMovementDate = new Date();
                stock.lastMovementType = 'transfer-out';
                await stock.save();

                await InventoryTransaction.create({
                    item: item.item,
                    transactionType: 'transfer',
                    quantity: -item.quantity,
                    previousQuantity: stock.quantity + item.quantity,
                    newQuantity: stock.quantity,
                    reason: 'Stock Transfer Out',
                    remarks: `Transfer: ${transfer.transferNumber} to ${transfer.destinationLocation}`,
                    createdBy: userId
                });
            }
        } else if (action === 'receive') {
            // Add to destination
            for (const item of transfer.items) {
                let stock = await InventoryStock.findOne({
                    item: item.item,
                    location: transfer.destinationLocation,
                    batchNumber: item.batchNumber || { $exists: false }
                });

                if (!stock) {
                    stock = new InventoryStock({
                        item: item.item,
                        location: transfer.destinationLocation,
                        batchNumber: item.batchNumber,
                        expiryDate: item.expiryDate,
                        quantity: 0,
                        purchaseRate: item.rate,
                        createdBy: userId
                    });
                }

                const previousQty = stock.quantity;
                stock.quantity += item.receivedQuantity;
                stock.lastMovementDate = new Date();
                stock.lastMovementType = 'transfer-in';
                await stock.save();

                await InventoryTransaction.create({
                    item: item.item,
                    transactionType: 'transfer',
                    quantity: item.receivedQuantity,
                    previousQuantity: previousQty,
                    newQuantity: stock.quantity,
                    reason: 'Stock Transfer In',
                    remarks: `Transfer: ${transfer.transferNumber} from ${transfer.sourceLocation}`,
                    createdBy: userId
                });
            }
        }
    }

    /**
     * Block a batch/stock
     */
    static async blockStock(stockId, reason, userId) {
        const stock = await InventoryStock.findById(stockId);
        if (!stock) throw new Error('Stock not found');

        stock.isBlocked = true;
        stock.blockReason = reason;
        stock.blockedBy = userId;
        stock.blockedAt = new Date();
        stock.status = INVENTORY_STATUS.BLOCKED;

        await stock.save();
        return stock;
    }

    /**
     * Unblock a batch/stock
     */
    static async unblockStock(stockId, userId) {
        const stock = await InventoryStock.findById(stockId);
        if (!stock) throw new Error('Stock not found');

        stock.isBlocked = false;
        stock.blockReason = null;
        stock.blockedBy = null;
        stock.blockedAt = null;
        stock.status = INVENTORY_STATUS.AVAILABLE;

        await stock.save();
        return stock;
    }

    /**
     * Get stock movement history for an item
     */
    static async getStockMovementHistory(itemId, filters = {}) {
        const query = { item: itemId };

        if (filters.startDate) {
            query.createdAt = { $gte: new Date(filters.startDate) };
        }
        if (filters.endDate) {
            query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
        }
        if (filters.transactionType) {
            query.transactionType = filters.transactionType;
        }

        const transactions = await InventoryTransaction.find(query)
            .populate('item', 'itemCode itemName')
            .populate('department', 'name')
            .populate('issuedTo', 'profile.firstName profile.lastName')
            .populate('createdBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 })
            .limit(filters.limit || 100);

        return transactions;
    }

    /**
     * Update PO status based on GRN receipts
     */
    static async updatePOStatusFromGRN(purchaseOrderId) {
        const po = await PurchaseOrder.findById(purchaseOrderId);
        if (!po) throw new Error('Purchase Order not found');

        let allReceived = true;
        let someReceived = false;

        for (const item of po.items) {
            if (item.receivedQuantity < item.quantity) {
                allReceived = false;
            }
            if (item.receivedQuantity > 0) {
                someReceived = true;
            }
        }

        if (allReceived) {
            po.status = PURCHASE_ORDER_STATUS.CLOSED;
        } else if (someReceived) {
            po.status = PURCHASE_ORDER_STATUS.PARTIAL;
        }

        await po.save();
        return po;
    }

    /**
     * Get items affected by recall
     */
    static async getRecallAffectedStock(itemId, batchNumber = null) {
        const query = { item: itemId, quantity: { $gt: 0 } };
        if (batchNumber) query.batchNumber = batchNumber;

        const stocks = await InventoryStock.find(query)
            .populate('item', 'itemCode itemName')
            .populate('location', 'locationCode locationName');

        return stocks;
    }

    /**
     * Get dashboard summary for Inventory Manager
     */
    static async getDashboardSummary(locationId = null) {
        const [
            totalItems,
            activeVendors,
            lowStockItems,
            nearExpiryItems,
            expiredItems,
            pendingPRs,
            pendingPOs,
            pendingIssues,
            pendingTransfers,
            activeRecalls
        ] = await Promise.all([
            InventoryItem.countDocuments({ isActive: true }),
            VendorMaster.countDocuments({ isActive: true }),
            this.getLowStockItems(locationId).then(items => items.length),
            this.getNearExpiryItems(30, locationId).then(items => items.length),
            this.getExpiredItems(locationId).then(items => items.length),
            PurchaseRequisition.countDocuments({ status: { $in: ['submitted'] } }),
            PurchaseOrder.countDocuments({ status: { $in: ['pending', 'approved', 'ordered', 'partial'] } }),
            StockIssue.countDocuments({ status: STOCK_ISSUE_STATUS.PENDING }),
            StockTransfer.countDocuments({ status: { $in: ['pending', 'approved', 'in-transit'] } }),
            InventoryRecall.countDocuments({ status: { $in: ['active', 'in-progress'] } })
        ]);

        return {
            totalItems,
            activeVendors,
            lowStockItems,
            nearExpiryItems,
            expiredItems,
            pendingPRs,
            pendingPOs,
            pendingIssues,
            pendingTransfers,
            activeRecalls
        };
    }
}

module.exports = InventoryManagerService;
