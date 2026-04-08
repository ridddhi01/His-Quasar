const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const PharmacyInventory = require('../models/PharmacyInventory');

/**
 * Inventory Service
 * Handles stock management business logic
 */

class InventoryService {
    /**
     * Check low stock items
     */
    async checkLowStock() {
        const lowStockItems = await Inventory.find({
            $expr: { $lte: ['$quantity', '$reorderLevel'] },
        }).sort({ quantity: 1 });

        return lowStockItems;
    }

    /**
     * Stock in operation
     */
    async stockIn(itemId, quantity, details, userId) {
        const item = await Inventory.findById(itemId);
        if (!item) throw new Error('Item not found');

        const previousQuantity = item.quantity;
        item.quantity += quantity;
        item.lastPurchaseDate = new Date();
        if (details.rate) item.lastPurchaseRate = details.rate;
        await item.save();

        // Create transaction record
        const transaction = await InventoryTransaction.create({
            item: itemId,
            transactionType: 'stock-in',
            quantity,
            previousQuantity,
            newQuantity: item.quantity,
            rate: details.rate,
            totalAmount: quantity * (details.rate || 0),
            supplier: details.supplier,
            invoiceNumber: details.invoiceNumber,
            invoiceDate: details.invoiceDate,
            remarks: details.remarks,
            createdBy: userId,
        });

        return { item, transaction };
    }

    /**
     * Stock out operation
     */
    async stockOut(itemId, quantity, details, userId) {
        const item = await Inventory.findById(itemId);
        if (!item) throw new Error('Item not found');

        if (item.quantity < quantity) {
            throw new Error('Insufficient stock');
        }

        const previousQuantity = item.quantity;
        item.quantity -= quantity;
        await item.save();

        // Create transaction record
        const transaction = await InventoryTransaction.create({
            item: itemId,
            transactionType: 'stock-out',
            quantity: -quantity,
            previousQuantity,
            newQuantity: item.quantity,
            department: details.department,
            issuedTo: details.issuedTo,
            reason: details.reason,
            remarks: details.remarks,
            createdBy: userId,
        });

        return { item, transaction };
    }

    /**
     * Adjust stock
     */
    async adjustStock(itemId, newQuantity, reason, userId) {
        const item = await Inventory.findById(itemId);
        if (!item) throw new Error('Item not found');

        const previousQuantity = item.quantity;
        const difference = newQuantity - previousQuantity;
        item.quantity = newQuantity;
        await item.save();

        // Create adjustment transaction
        const transaction = await InventoryTransaction.create({
            item: itemId,
            transactionType: 'adjustment',
            quantity: difference,
            previousQuantity,
            newQuantity: item.quantity,
            reason,
            createdBy: userId,
        });

        return { item, transaction };
    }

    /**
     * Check pharmacy expiry
     */
    async checkPharmacyExpiry(daysAhead = 30) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysAhead);

        return PharmacyInventory.find({
            expiryDate: { $lte: expiryDate },
            quantity: { $gt: 0 },
        })
            .populate('medicine', 'name genericName')
            .sort({ expiryDate: 1 });
    }

    /**
     * Get stock movement report
     */
    async getStockMovement(itemId, startDate, endDate) {
        const transactions = await InventoryTransaction.find({
            item: itemId,
            createdAt: { $gte: startDate, $lte: endDate },
        })
            .populate('createdBy', 'profile.firstName profile.lastName')
            .sort({ createdAt: -1 });

        const summary = {
            totalIn: 0,
            totalOut: 0,
            adjustments: 0,
        };

        transactions.forEach((t) => {
            if (t.transactionType === 'stock-in') {
                summary.totalIn += t.quantity;
            } else if (t.transactionType === 'stock-out') {
                summary.totalOut += Math.abs(t.quantity);
            } else {
                summary.adjustments += t.quantity;
            }
        });

        return { transactions, summary };
    }

    /**
     * Get inventory valuation
     */
    async getInventoryValuation() {
        const items = await Inventory.find({ quantity: { $gt: 0 } });

        let totalValue = 0;
        const valuations = items.map((item) => {
            const value = item.quantity * (item.lastPurchaseRate || 0);
            totalValue += value;
            return {
                itemCode: item.itemCode,
                itemName: item.itemName,
                quantity: item.quantity,
                rate: item.lastPurchaseRate,
                value,
            };
        });

        return { items: valuations, totalValue };
    }

    /**
     * Generate reorder list
     */
    async generateReorderList() {
        const lowStockItems = await Inventory.find({
            $expr: { $lte: ['$quantity', '$reorderLevel'] },
        });

        return lowStockItems.map((item) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            currentStock: item.quantity,
            reorderLevel: item.reorderLevel,
            suggestedQuantity: (item.reorderLevel * 2) - item.quantity,
            lastPurchaseRate: item.lastPurchaseRate,
            lastSupplier: item.lastSupplier,
        }));
    }
}

module.exports = new InventoryService();
