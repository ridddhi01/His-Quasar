/**
 * Master Data Controller
 * Handles Admin workflows for configuring hospital operational skeleton
 * 
 * Entities Managed:
 * - Departments
 * - Wards
 * - Beds
 * - Tariffs & Service Pricing
 * - Order Sets
 * - Critical Value Thresholds
 * - Drug Interaction Rules
 */

const Department = require('../models/Department');
const Ward = require('../models/Ward');
const Bed = require('../models/Bed');
const Tariff = require('../models/Tariff');
const OrderSet = require('../models/OrderSet');
const CriticalValue = require('../models/CriticalValue');
const DrugInteraction = require('../models/DrugInteraction');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { createAuditLog } = require('../services/audit.service');

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT MANAGEMENT
// Workflow: Create → Update → Deactivate (soft delete)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all departments
 * @route   GET /api/admin/master/departments
 */
exports.getDepartments = asyncHandler(async (req, res, next) => {
    const { type, isActive, search } = req.query;

    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.$text = { $search: search };

    const departments = await Department.find(query)
        .populate('head', 'profile.firstName profile.lastName')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: departments.length,
        data: departments,
    });
});

/**
 * @desc    Create department
 * @route   POST /api/admin/master/departments
 * @validation
 *   - departmentCode: Required, unique
 *   - name: Required
 *   - type: Required, enum [clinical, diagnostic, support, administrative]
 */
exports.createDepartment = asyncHandler(async (req, res, next) => {
    // Validate unique code
    const existing = await Department.findOne({ departmentCode: req.body.departmentCode });
    if (existing) {
        return next(new ErrorResponse(`Department code '${req.body.departmentCode}' already exists`, 400));
    }

    const department = await Department.create(req.body);

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_DEPARTMENT_CREATE',
        entity: 'Department',
        entityId: department._id,
        description: `Created department: ${department.name} (${department.departmentCode})`,
        changes: req.body,
    });

    res.status(201).json({
        success: true,
        data: department,
    });
});

/**
 * @desc    Update department
 * @route   PUT /api/admin/master/departments/:id
 */
exports.updateDepartment = asyncHandler(async (req, res, next) => {
    const oldDepartment = await Department.findById(req.params.id);
    if (!oldDepartment) {
        return next(new ErrorResponse('Department not found', 404));
    }

    // Prevent code change if department has associated records
    if (req.body.departmentCode && req.body.departmentCode !== oldDepartment.departmentCode) {
        const wardCount = await Ward.countDocuments({ department: req.params.id });
        if (wardCount > 0) {
            return next(new ErrorResponse('Cannot change department code - has associated wards', 400));
        }
    }

    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_DEPARTMENT_UPDATE',
        entity: 'Department',
        entityId: department._id,
        description: `Updated department: ${department.name}`,
        changes: req.body,
    });

    res.status(200).json({
        success: true,
        data: department,
    });
});

/**
 * @desc    Deactivate department (soft delete)
 * @route   DELETE /api/admin/master/departments/:id
 * @integrity
 *   - Cannot deactivate if active wards exist
 *   - Cannot deactivate if active staff assigned
 */
exports.deactivateDepartment = asyncHandler(async (req, res, next) => {
    const department = await Department.findById(req.params.id);
    if (!department) {
        return next(new ErrorResponse('Department not found', 404));
    }

    // Data integrity check
    const activeWards = await Ward.countDocuments({ department: req.params.id, isActive: true });
    if (activeWards > 0) {
        return next(new ErrorResponse(
            `Cannot deactivate department - ${activeWards} active ward(s) exist. Deactivate wards first.`,
            400
        ));
    }

    department.isActive = false;
    await department.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_DEPARTMENT_DEACTIVATE',
        entity: 'Department',
        entityId: department._id,
        description: `Deactivated department: ${department.name}`,
    });

    res.status(200).json({
        success: true,
        message: 'Department deactivated successfully',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WARD MANAGEMENT
// Workflow: Create → Update → Deactivate
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all wards
 * @route   GET /api/admin/master/wards
 */
exports.getWards = asyncHandler(async (req, res, next) => {
    const { department, type, isActive } = req.query;

    const query = {};
    if (department) query.department = department;
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const wards = await Ward.find(query)
        .populate('department', 'name departmentCode')
        .populate('inCharge', 'profile.firstName profile.lastName')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: wards.length,
        data: wards,
    });
});

/**
 * @desc    Create ward
 * @route   POST /api/admin/master/wards
 * @validation
 *   - wardCode: Required, unique
 *   - name: Required
 *   - type: Required, enum
 */
exports.createWard = asyncHandler(async (req, res, next) => {
    // Validate department exists and is active
    if (req.body.department) {
        const dept = await Department.findById(req.body.department);
        if (!dept) {
            return next(new ErrorResponse('Department not found', 404));
        }
        if (!dept.isActive) {
            return next(new ErrorResponse('Cannot assign ward to inactive department', 400));
        }
    }

    const ward = await Ward.create(req.body);

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_WARD_CREATE',
        entity: 'Ward',
        entityId: ward._id,
        description: `Created ward: ${ward.name} (${ward.wardCode})`,
        changes: req.body,
    });

    res.status(201).json({
        success: true,
        data: ward,
    });
});

/**
 * @desc    Update ward
 * @route   PUT /api/admin/master/wards/:id
 */
exports.updateWard = asyncHandler(async (req, res, next) => {
    const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!ward) {
        return next(new ErrorResponse('Ward not found', 404));
    }

    // Update totalBeds count
    const bedCount = await Bed.countDocuments({ ward: ward._id });
    ward.totalBeds = bedCount;
    await ward.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_WARD_UPDATE',
        entity: 'Ward',
        entityId: ward._id,
        description: `Updated ward: ${ward.name}`,
        changes: req.body,
    });

    res.status(200).json({
        success: true,
        data: ward,
    });
});

/**
 * @desc    Deactivate ward
 * @route   DELETE /api/admin/master/wards/:id
 * @integrity
 *   - Cannot deactivate if occupied beds exist
 */
exports.deactivateWard = asyncHandler(async (req, res, next) => {
    const ward = await Ward.findById(req.params.id);
    if (!ward) {
        return next(new ErrorResponse('Ward not found', 404));
    }

    // Check for occupied beds
    const occupiedBeds = await Bed.countDocuments({ ward: req.params.id, status: 'occupied' });
    if (occupiedBeds > 0) {
        return next(new ErrorResponse(
            `Cannot deactivate ward - ${occupiedBeds} occupied bed(s). Transfer patients first.`,
            400
        ));
    }

    ward.isActive = false;
    await ward.save();

    // Also deactivate all beds in this ward
    await Bed.updateMany({ ward: req.params.id }, { status: 'maintenance' });

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_WARD_DEACTIVATE',
        entity: 'Ward',
        entityId: ward._id,
        description: `Deactivated ward: ${ward.name}`,
    });

    res.status(200).json({
        success: true,
        message: 'Ward deactivated successfully',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BED MANAGEMENT
// Workflow: Create → Update → Set Maintenance
// Note: Admin creates beds, Clinical staff allocates patients
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all beds
 * @route   GET /api/admin/master/beds
 */
exports.getBeds = asyncHandler(async (req, res, next) => {
    const { ward, bedType, status } = req.query;

    const query = {};
    if (ward) query.ward = ward;
    if (bedType) query.bedType = bedType;
    if (status) query.status = status;

    const beds = await Bed.find(query)
        .populate('ward', 'name wardCode')
        .populate('currentPatient', 'firstName lastName patientId')
        .sort({ ward: 1, bedNumber: 1 });

    res.status(200).json({
        success: true,
        count: beds.length,
        data: beds,
    });
});

/**
 * @desc    Create bed
 * @route   POST /api/admin/master/beds
 * @validation
 *   - bedNumber: Required, unique within ward
 *   - ward: Required, must be active
 *   - bedType: Required
 *   - tariff: Required, non-negative
 */
exports.createBed = asyncHandler(async (req, res, next) => {
    // Validate ward
    const ward = await Ward.findById(req.body.ward);
    if (!ward) {
        return next(new ErrorResponse('Ward not found', 404));
    }
    if (!ward.isActive) {
        return next(new ErrorResponse('Cannot add bed to inactive ward', 400));
    }

    // Check unique bed number within ward
    const existing = await Bed.findOne({ ward: req.body.ward, bedNumber: req.body.bedNumber });
    if (existing) {
        return next(new ErrorResponse(`Bed ${req.body.bedNumber} already exists in this ward`, 400));
    }

    const bed = await Bed.create(req.body);

    // Update ward's totalBeds
    await Ward.findByIdAndUpdate(req.body.ward, { $inc: { totalBeds: 1 } });

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_BED_CREATE',
        entity: 'Bed',
        entityId: bed._id,
        description: `Created bed: ${bed.bedNumber} in ward ${ward.name}`,
        changes: req.body,
    });

    res.status(201).json({
        success: true,
        data: bed,
    });
});

/**
 * @desc    Update bed (configuration only, not allocation)
 * @route   PUT /api/admin/master/beds/:id
 */
exports.updateBed = asyncHandler(async (req, res, next) => {
    // Admin can only update: bedType, tariff, features, notes
    // Cannot change: status (clinical), currentPatient (clinical)
    const allowedFields = ['bedType', 'tariff', 'features', 'notes'];
    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }

    const bed = await Bed.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
    });

    if (!bed) {
        return next(new ErrorResponse('Bed not found', 404));
    }

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_BED_UPDATE',
        entity: 'Bed',
        entityId: bed._id,
        description: `Updated bed: ${bed.bedNumber}`,
        changes: updates,
    });

    res.status(200).json({
        success: true,
        data: bed,
    });
});

/**
 * @desc    Set bed to maintenance (Admin action)
 * @route   PUT /api/admin/master/beds/:id/maintenance
 * @integrity
 *   - Cannot set to maintenance if occupied
 */
exports.setBedMaintenance = asyncHandler(async (req, res, next) => {
    const bed = await Bed.findById(req.params.id);
    if (!bed) {
        return next(new ErrorResponse('Bed not found', 404));
    }

    if (bed.status === 'occupied') {
        return next(new ErrorResponse('Cannot set occupied bed to maintenance. Discharge patient first.', 400));
    }

    bed.status = req.body.maintenance ? 'maintenance' : 'available';
    bed.notes = req.body.reason || bed.notes;
    await bed.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_BED_MAINTENANCE',
        entity: 'Bed',
        entityId: bed._id,
        description: `Set bed ${bed.bedNumber} to ${bed.status}`,
        changes: { status: bed.status, reason: req.body.reason },
    });

    res.status(200).json({
        success: true,
        data: bed,
    });
});

/**
 * @desc    Bulk create beds
 * @route   POST /api/admin/master/beds/bulk
 */
exports.bulkCreateBeds = asyncHandler(async (req, res, next) => {
    const { wardId, bedPrefix, startNumber, count, bedType, tariff } = req.body;

    const ward = await Ward.findById(wardId);
    if (!ward) {
        return next(new ErrorResponse('Ward not found', 404));
    }

    const bedsToCreate = [];
    for (let i = 0; i < count; i++) {
        bedsToCreate.push({
            bedNumber: `${bedPrefix}${startNumber + i}`,
            ward: wardId,
            bedType,
            tariff,
            status: 'available',
        });
    }

    const beds = await Bed.insertMany(bedsToCreate, { ordered: false });

    // Update ward's totalBeds
    await Ward.findByIdAndUpdate(wardId, { $inc: { totalBeds: beds.length } });

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_BED_BULK_CREATE',
        entity: 'Bed',
        description: `Bulk created ${beds.length} beds in ward ${ward.name}`,
        changes: { wardId, prefix: bedPrefix, count: beds.length },
    });

    res.status(201).json({
        success: true,
        count: beds.length,
        data: beds,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFF MANAGEMENT
// Workflow: Create → Update → Deactivate
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all tariffs
 * @route   GET /api/admin/master/tariffs
 */
exports.getTariffs = asyncHandler(async (req, res, next) => {
    const { category, serviceType, isActive, department } = req.query;

    const query = {};
    if (category) query.category = category;
    if (serviceType) query.serviceType = serviceType;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const tariffs = await Tariff.find(query)
        .populate('category', 'name')
        .populate('department', 'name')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: tariffs.length,
        data: tariffs,
    });
});

/**
 * @desc    Create tariff
 * @route   POST /api/admin/master/tariffs
 */
exports.createTariff = asyncHandler(async (req, res, next) => {
    const tariff = await Tariff.create(req.body);

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_TARIFF_CREATE',
        entity: 'Tariff',
        entityId: tariff._id,
        description: `Created tariff: ${tariff.name} (${tariff.tariffCode}) - ₹${tariff.basePrice}`,
        changes: req.body,
    });

    res.status(201).json({
        success: true,
        data: tariff,
    });
});

/**
 * @desc    Update tariff
 * @route   PUT /api/admin/master/tariffs/:id
 * @note    Price changes take effect from effectiveFrom date
 */
exports.updateTariff = asyncHandler(async (req, res, next) => {
    const oldTariff = await Tariff.findById(req.params.id);
    if (!oldTariff) {
        return next(new ErrorResponse('Tariff not found', 404));
    }

    // Track price change
    const priceChanged = req.body.basePrice && req.body.basePrice !== oldTariff.basePrice;

    const tariff = await Tariff.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_TARIFF_UPDATE',
        entity: 'Tariff',
        entityId: tariff._id,
        description: `Updated tariff: ${tariff.name}${priceChanged ? ` - Price changed from ₹${oldTariff.basePrice} to ₹${tariff.basePrice}` : ''}`,
        changes: req.body,
    });

    res.status(200).json({
        success: true,
        data: tariff,
    });
});

/**
 * @desc    Deactivate tariff
 * @route   DELETE /api/admin/master/tariffs/:id
 */
exports.deactivateTariff = asyncHandler(async (req, res, next) => {
    const tariff = await Tariff.findById(req.params.id);
    if (!tariff) {
        return next(new ErrorResponse('Tariff not found', 404));
    }

    tariff.isActive = false;
    await tariff.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_TARIFF_DEACTIVATE',
        entity: 'Tariff',
        entityId: tariff._id,
        description: `Deactivated tariff: ${tariff.name}`,
    });

    res.status(200).json({
        success: true,
        message: 'Tariff deactivated successfully',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER SET MANAGEMENT
// Workflow: Create → Update → Deactivate
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all order sets
 * @route   GET /api/admin/master/order-sets
 */
exports.getOrderSets = asyncHandler(async (req, res, next) => {
    const { category, subCategory, isActive } = req.query;

    const query = {};
    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const orderSets = await OrderSet.find(query)
        .populate('createdBy', 'profile.firstName profile.lastName')
        .populate('applicableDepartments', 'name')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: orderSets.length,
        data: orderSets,
    });
});

/**
 * @desc    Create order set
 * @route   POST /api/admin/master/order-sets
 */
exports.createOrderSet = asyncHandler(async (req, res, next) => {
    req.body.createdBy = req.user._id;

    const orderSet = await OrderSet.create(req.body);

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_ORDERSET_CREATE',
        entity: 'OrderSet',
        entityId: orderSet._id,
        description: `Created order set: ${orderSet.name} (${orderSet.category}/${orderSet.subCategory})`,
        changes: { name: orderSet.name, category: orderSet.category },
    });

    res.status(201).json({
        success: true,
        data: orderSet,
    });
});

/**
 * @desc    Update order set
 * @route   PUT /api/admin/master/order-sets/:id
 */
exports.updateOrderSet = asyncHandler(async (req, res, next) => {
    req.body.lastModifiedBy = req.user._id;

    // Increment version on update
    const orderSet = await OrderSet.findByIdAndUpdate(
        req.params.id,
        { ...req.body, $inc: { version: 1 } },
        { new: true, runValidators: true }
    );

    if (!orderSet) {
        return next(new ErrorResponse('Order set not found', 404));
    }

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_ORDERSET_UPDATE',
        entity: 'OrderSet',
        entityId: orderSet._id,
        description: `Updated order set: ${orderSet.name} (v${orderSet.version})`,
        changes: req.body,
    });

    res.status(200).json({
        success: true,
        data: orderSet,
    });
});

/**
 * @desc    Deactivate order set
 * @route   DELETE /api/admin/master/order-sets/:id
 */
exports.deactivateOrderSet = asyncHandler(async (req, res, next) => {
    const orderSet = await OrderSet.findById(req.params.id);
    if (!orderSet) {
        return next(new ErrorResponse('Order set not found', 404));
    }

    orderSet.isActive = false;
    orderSet.lastModifiedBy = req.user._id;
    await orderSet.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_ORDERSET_DEACTIVATE',
        entity: 'OrderSet',
        entityId: orderSet._id,
        description: `Deactivated order set: ${orderSet.name}`,
    });

    res.status(200).json({
        success: true,
        message: 'Order set deactivated successfully',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL VALUE THRESHOLD MANAGEMENT
// Workflow: Create → Update → Deactivate
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all critical value configurations
 * @route   GET /api/admin/master/critical-values
 */
exports.getCriticalValues = asyncHandler(async (req, res, next) => {
    const { category, isActive } = req.query;

    const query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const criticalValues = await CriticalValue.find(query)
        .sort({ category: 1, parameterName: 1 });

    res.status(200).json({
        success: true,
        count: criticalValues.length,
        data: criticalValues,
    });
});

/**
 * @desc    Create critical value threshold
 * @route   POST /api/admin/master/critical-values
 * @validation
 *   - lowCritical < highCritical
 *   - lowWarning < highWarning (if provided)
 */
exports.createCriticalValue = asyncHandler(async (req, res, next) => {
    // Validation
    if (req.body.lowCritical >= req.body.highCritical) {
        return next(new ErrorResponse('Low critical must be less than high critical', 400));
    }
    if (req.body.lowWarning && req.body.highWarning && req.body.lowWarning >= req.body.highWarning) {
        return next(new ErrorResponse('Low warning must be less than high warning', 400));
    }

    req.body.createdBy = req.user._id;

    const criticalValue = await CriticalValue.create(req.body);

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_CRITICALVALUE_CREATE',
        entity: 'CriticalValue',
        entityId: criticalValue._id,
        description: `Created critical value: ${criticalValue.parameterName} (${criticalValue.lowCritical} - ${criticalValue.highCritical} ${criticalValue.unit})`,
        changes: req.body,
    });

    res.status(201).json({
        success: true,
        data: criticalValue,
    });
});

/**
 * @desc    Update critical value threshold
 * @route   PUT /api/admin/master/critical-values/:id
 */
exports.updateCriticalValue = asyncHandler(async (req, res, next) => {
    req.body.lastModifiedBy = req.user._id;

    const criticalValue = await CriticalValue.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!criticalValue) {
        return next(new ErrorResponse('Critical value configuration not found', 404));
    }

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_CRITICALVALUE_UPDATE',
        entity: 'CriticalValue',
        entityId: criticalValue._id,
        description: `Updated critical value: ${criticalValue.parameterName}`,
        changes: req.body,
    });

    res.status(200).json({
        success: true,
        data: criticalValue,
    });
});

/**
 * @desc    Deactivate critical value
 * @route   DELETE /api/admin/master/critical-values/:id
 */
exports.deactivateCriticalValue = asyncHandler(async (req, res, next) => {
    const criticalValue = await CriticalValue.findById(req.params.id);
    if (!criticalValue) {
        return next(new ErrorResponse('Critical value configuration not found', 404));
    }

    criticalValue.isActive = false;
    await criticalValue.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_CRITICALVALUE_DEACTIVATE',
        entity: 'CriticalValue',
        entityId: criticalValue._id,
        description: `Deactivated critical value: ${criticalValue.parameterName}`,
    });

    res.status(200).json({
        success: true,
        message: 'Critical value configuration deactivated',
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRUG INTERACTION RULE MANAGEMENT
// Workflow: Create → Update → Deactivate
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @desc    Get all drug interactions
 * @route   GET /api/admin/master/drug-interactions
 */
exports.getDrugInteractions = asyncHandler(async (req, res, next) => {
    const { severity, isActive, drug } = req.query;

    const query = {};
    if (severity) query.severity = severity;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (drug) {
        query.$or = [{ drug1: drug }, { drug2: drug }];
    }

    const interactions = await DrugInteraction.find(query)
        .populate('drug1', 'name genericName')
        .populate('drug2', 'name genericName')
        .sort({ severity: 1 });

    res.status(200).json({
        success: true,
        count: interactions.length,
        data: interactions,
    });
});

/**
 * @desc    Create drug interaction rule
 * @route   POST /api/admin/master/drug-interactions
 * @validation
 *   - drug1 !== drug2
 *   - No duplicate pair
 */
exports.createDrugInteraction = asyncHandler(async (req, res, next) => {
    // Validate different drugs
    if (req.body.drug1 === req.body.drug2) {
        return next(new ErrorResponse('Cannot create interaction between the same drug', 400));
    }

    // Check for existing pair
    const existing = await DrugInteraction.findOne({
        $or: [
            { drug1: req.body.drug1, drug2: req.body.drug2 },
            { drug1: req.body.drug2, drug2: req.body.drug1 },
        ],
    });
    if (existing) {
        return next(new ErrorResponse('Interaction rule already exists for this drug pair', 400));
    }

    req.body.createdBy = req.user._id;

    const interaction = await DrugInteraction.create(req.body);

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_DRUGINTERACTION_CREATE',
        entity: 'DrugInteraction',
        entityId: interaction._id,
        description: `Created drug interaction: ${interaction.drug1Name} <-> ${interaction.drug2Name} (${interaction.severity})`,
        changes: req.body,
    });

    res.status(201).json({
        success: true,
        data: interaction,
    });
});

/**
 * @desc    Update drug interaction rule
 * @route   PUT /api/admin/master/drug-interactions/:id
 */
exports.updateDrugInteraction = asyncHandler(async (req, res, next) => {
    req.body.lastModifiedBy = req.user._id;

    const interaction = await DrugInteraction.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!interaction) {
        return next(new ErrorResponse('Drug interaction rule not found', 404));
    }

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_DRUGINTERACTION_UPDATE',
        entity: 'DrugInteraction',
        entityId: interaction._id,
        description: `Updated drug interaction: ${interaction.drug1Name} <-> ${interaction.drug2Name}`,
        changes: req.body,
    });

    res.status(200).json({
        success: true,
        data: interaction,
    });
});

/**
 * @desc    Deactivate drug interaction
 * @route   DELETE /api/admin/master/drug-interactions/:id
 */
exports.deactivateDrugInteraction = asyncHandler(async (req, res, next) => {
    const interaction = await DrugInteraction.findById(req.params.id);
    if (!interaction) {
        return next(new ErrorResponse('Drug interaction rule not found', 404));
    }

    interaction.isActive = false;
    await interaction.save();

    // Audit Log
    await createAuditLog({
        user: req.user._id,
        action: 'MASTER_DRUGINTERACTION_DEACTIVATE',
        entity: 'DrugInteraction',
        entityId: interaction._id,
        description: `Deactivated drug interaction: ${interaction.drug1Name} <-> ${interaction.drug2Name}`,
    });

    res.status(200).json({
        success: true,
        message: 'Drug interaction rule deactivated',
    });
});

module.exports = exports;
