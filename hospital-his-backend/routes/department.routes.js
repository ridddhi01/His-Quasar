const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

/**
 * @route   GET /api/departments
 * @desc    Get all departments
 */
router.get('/', departmentController.getAllDepartments);

/**
 * @route   POST /api/departments
 * @desc    Create department
 */
router.post('/', authorize('admin'), departmentController.createDepartment);

/**
 * @route   GET /api/departments/:id
 * @desc    Get department by ID
 */
router.get('/:id', departmentController.getDepartmentById);

/**
 * @route   PUT /api/departments/:id
 * @desc    Update department
 */
router.put('/:id', authorize('admin'), departmentController.updateDepartment);

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete department
 */
router.delete('/:id', authorize('admin'), departmentController.deleteDepartment);

/**
 * @route   GET /api/departments/:id/doctors
 * @desc    Get doctors in department
 */
router.get('/:id/doctors', departmentController.getDepartmentDoctors);

module.exports = router;
