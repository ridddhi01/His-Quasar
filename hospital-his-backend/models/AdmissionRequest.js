const mongoose = require('mongoose');

const admissionRequestSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestDate: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['routine', 'urgent', 'emergency'],
        default: 'routine'
    },
    recommendedWardType: {
        type: String,
        enum: ['general', 'private', 'icu', 'ccu', 'ward'],
        default: 'general'
    },
    status: {
        type: String,
        enum: ['pending', 'admitted', 'rejected'],
        default: 'pending'
    },
    notes: String
}, { timestamps: true });

module.exports = mongoose.model('AdmissionRequest', admissionRequestSchema);
