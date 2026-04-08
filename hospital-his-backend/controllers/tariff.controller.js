const Tariff = require('../models/Tariff');
const TariffCategory = require('../models/TariffCategory');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all tariffs
 * @route   GET /api/tariffs
 */
exports.getAllTariffs = asyncHandler(async (req, res, next) => {
    const { category, serviceType, page = 1, limit = 50 } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;
    if (serviceType) query.serviceType = serviceType;

    const skip = (page - 1) * limit;

    const tariffs = await Tariff.find(query)
        .populate('category', 'name')
        .populate('department', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ name: 1 });

    const total = await Tariff.countDocuments(query);

    res.status(200).json({
        success: true,
        count: tariffs.length,
        total,
        page: parseInt(page),
        data: tariffs,
    });
});

/**
 * @desc    Create tariff
 * @route   POST /api/tariffs
 */
exports.createTariff = asyncHandler(async (req, res, next) => {
    const tariff = await Tariff.create(req.body);

    res.status(201).json({
        success: true,
        data: tariff,
    });
});

/**
 * @desc    Get tariff by ID
 * @route   GET /api/tariffs/:id
 */
exports.getTariffById = asyncHandler(async (req, res, next) => {
    const tariff = await Tariff.findById(req.params.id)
        .populate('category')
        .populate('department');

    if (!tariff) {
        return next(new ErrorResponse('Tariff not found', 404));
    }

    res.status(200).json({
        success: true,
        data: tariff,
    });
});

/**
 * @desc    Update tariff
 * @route   PUT /api/tariffs/:id
 */
exports.updateTariff = asyncHandler(async (req, res, next) => {
    const tariff = await Tariff.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!tariff) {
        return next(new ErrorResponse('Tariff not found', 404));
    }

    res.status(200).json({
        success: true,
        data: tariff,
    });
});

/**
 * @desc    Delete tariff
 * @route   DELETE /api/tariffs/:id
 */
exports.deleteTariff = asyncHandler(async (req, res, next) => {
    const tariff = await Tariff.findById(req.params.id);

    if (!tariff) {
        return next(new ErrorResponse('Tariff not found', 404));
    }

    tariff.isActive = false;
    await tariff.save();

    res.status(200).json({
        success: true,
        message: 'Tariff deactivated successfully',
    });
});

/**
 * @desc    Get tariff categories
 * @route   GET /api/tariffs/categories
 */
exports.getCategories = asyncHandler(async (req, res, next) => {
    const categories = await TariffCategory.find({ isActive: true })
        .populate('parent', 'name')
        .sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
    });
});

/**
 * @desc    Create tariff category
 * @route   POST /api/tariffs/categories
 */
exports.createCategory = asyncHandler(async (req, res, next) => {
    const category = await TariffCategory.create(req.body);

    res.status(201).json({
        success: true,
        data: category,
    });
});
