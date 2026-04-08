const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/incidents
 * @desc    Create incident report
 */
router.post('/', incidentController.createIncident);

/**
 * @route   GET /api/incidents
 * @desc    Get all incident reports
 */
router.get('/', incidentController.getAllIncidents);

/**
 * @route   GET /api/incidents/:id
 * @desc    Get incident report by ID
 */
router.get('/:id', incidentController.getIncidentById);

/**
 * @route   PUT /api/incidents/:id/status
 * @desc    Update incident status (Dept Head or Admin)
 */
router.put('/:id/status', incidentController.updateIncidentStatus);

/**
 * @route   PUT /api/incidents/:id/assign
 * @desc    Reassign incident to another user (Admin only)
 */
router.put('/:id/assign', incidentController.reassignIncident);

/**
 * @route   PUT /api/incidents/:id/notes
 * @desc    Add review notes to incident (Dept Head or Admin)
 */
router.put('/:id/notes', incidentController.addReviewNotes);

module.exports = router;
