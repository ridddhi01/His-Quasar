const express = require('express');
const router = express.Router();
const bedController = require('../controllers/bed.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @desc Specific routes (Must be before /:id)
 */
router.get('/wards', bedController.getWards);
router.get('/availability', bedController.getAvailability);
router.get('/occupancy', bedController.getOccupancy);

/**
 * @route   GET /api/beds
 * @desc    Get all beds
 */
router.get('/', bedController.getAllBeds);

/**
 * @route   POST /api/beds
 * @desc    Add new bed
 */
router.post('/', authorize('admin'), bedController.addBed);

/**
 * @route   POST /api/beds/allocate
 * @desc    Allocate bed to patient
 */
router.post('/allocate', authorize('receptionist', 'nurse', 'admin'), bedController.allocateBed);

/**
 * @route   POST /api/beds/transfer
 * @desc    Transfer patient to another bed
 */
router.post('/transfer', authorize('nurse', 'admin'), bedController.transferBed);

/**
 * @route   GET /api/beds/:id
 * @desc    Get bed by ID
 */
router.get('/:id', bedController.getBedById);

/**
 * @route   PUT /api/beds/:id
 * @desc    Update bed
 */
router.put('/:id', authorize('admin', 'nurse'), bedController.updateBed);

module.exports = router;
