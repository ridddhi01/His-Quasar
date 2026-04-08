const express = require('express');
const router = express.Router();
const tariffController = require('../controllers/tariff.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   GET /api/tariffs
 * @desc    Get all tariffs
 */
router.get('/', tariffController.getAllTariffs);

/**
 * @route   POST /api/tariffs
 * @desc    Create tariff
 */
router.post('/', authorize('admin'), tariffController.createTariff);

/**
 * @route   GET /api/tariffs/:id
 * @desc    Get tariff by ID
 */
router.get('/:id', tariffController.getTariffById);

/**
 * @route   PUT /api/tariffs/:id
 * @desc    Update tariff
 */
router.put('/:id', authorize('admin'), tariffController.updateTariff);

/**
 * @route   DELETE /api/tariffs/:id
 * @desc    Delete tariff
 */
router.delete('/:id', authorize('admin'), tariffController.deleteTariff);

/**
 * @route   GET /api/tariffs/categories
 * @desc    Get tariff categories
 */
router.get('/categories', tariffController.getCategories);

/**
 * @route   POST /api/tariffs/categories
 * @desc    Create tariff category
 */
router.post('/categories', authorize('admin'), tariffController.createCategory);

module.exports = router;
