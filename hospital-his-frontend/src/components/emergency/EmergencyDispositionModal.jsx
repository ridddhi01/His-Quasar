
import React, { useState } from 'react';
import emergencyOrderSetService from '../../services/emergency.orderSet.service';
import './EmergencyDispositionModal.css';

/**
 * Emergency Disposition Modal
 * Handles workflows for moving patients out of Emergency (IPD, ICU, OT, Discharge)
 */
const EmergencyDispositionModal = ({ emergencyCase, onClose, onDispositionComplete }) => {
    const [dispositionType, setDispositionType] = useState(''); // 'ipd', 'icu', 'ot', 'discharge'
    const [targetWard, setTargetWard] = useState('');
    const [surgeryNotes, setSurgeryNotes] = useState('');
    const [dischargeSummary, setDischargeSummary] = useState('');
    const [transferNotes, setTransferNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                dispositionType,
                targetWard: dispositionType === 'ipd' ? targetWard : undefined,
                surgeryNotes: dispositionType === 'ot' ? surgeryNotes : undefined,
                dischargeSummary: dispositionType === 'discharge' ? dischargeSummary : undefined,
                transferNotes
            };

            const result = await emergencyOrderSetService.processDisposition(emergencyCase._id, data);

            if (onDispositionComplete) onDispositionComplete(result);
            onClose();
        } catch (error) {
            console.error("Error processing disposition:", error);
            alert("Failed to process disposition: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const renderFormContent = () => {
        switch (dispositionType) {
            case 'ipd':
                return (
                    <div className="disposition-section">
                        <h4>Shift to In-Patient Department (IPD)</h4>
                        <div className="form-group">
                            <label>Recommended Ward Type</label>
                            <select
                                className="form-control"
                                value={targetWard}
                                onChange={(e) => setTargetWard(e.target.value)}
                                required
                            >
                                <option value="">Select Ward Type...</option>
                                <option value="general">General Ward</option>
                                <option value="semi-private">Semi-Private Room</option>
                                <option value="private">Private Room</option>
                                <option value="icu">ICU</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Transfer Notes</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder="Reason for admission, special instructions..."
                                required
                            ></textarea>
                        </div>
                    </div>
                );
            case 'icu':
                return (
                    <div className="disposition-section">
                        <h4>Shift to Intensive Care Unit (ICU)</h4>
                        <div className="alert alert-warning">
                            <i className="fas fa-exclamation-triangle"></i>
                            <strong> Critical Transfer:</strong> This will trigger ICU admission protocols and alert the ICU team immediately.
                        </div>
                        <div className="form-group">
                            <label>Critical Care Notes</label>
                            <textarea
                                className="form-control"
                                rows="4"
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder="Patient condition, ventilation status, drips, urgency..."
                                required
                            ></textarea>
                        </div>
                    </div>
                );
            case 'ot':
                return (
                    <div className="disposition-section">
                        <h4>Shift to Operation Theatre (OT)</h4>
                        <div className="form-group">
                            <label>Planned Procedure / Surgery</label>
                            <input
                                type="text"
                                className="form-control"
                                value={surgeryNotes}
                                onChange={(e) => setSurgeryNotes(e.target.value)}
                                placeholder="Ex: Exploratory Laparotomy"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Pre-Op Notes</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder="NPO status, consent status, blood arranged..."
                                required
                            ></textarea>
                        </div>
                    </div>
                );
            case 'discharge':
                return (
                    <div className="disposition-section">
                        <h4>Discharge from Emergency</h4>
                        <div className="form-group">
                            <label>Discharge Summary & Advice</label>
                            <textarea
                                className="form-control"
                                rows="5"
                                value={dischargeSummary}
                                onChange={(e) => setDischargeSummary(e.target.value)}
                                placeholder="Treatment given, medications prescribed, follow-up instructions..."
                                required
                            ></textarea>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 60 }}>
            <div className="modal-content disposition-modal">
                <div className="modal-header">
                    <h2>Patient Disposition</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {!dispositionType ? (
                        <div className="disposition-options">
                            <h3>Select Final Disposition for {emergencyCase.patient?.firstName}</h3>
                            <div className="options-grid">
                                <button className="opt-btn opt-ipd" onClick={() => setDispositionType('ipd')}>
                                    <span className="icon">🛏️</span>
                                    <span className="label">Shift to IPD</span>
                                </button>
                                <button className="opt-btn opt-icu" onClick={() => setDispositionType('icu')}>
                                    <span className="icon">🏥</span>
                                    <span className="label">Shift to ICU</span>
                                </button>
                                <button className="opt-btn opt-ot" onClick={() => setDispositionType('ot')}>
                                    <span className="icon">🔪</span>
                                    <span className="label">Shift to OT</span>
                                </button>
                                <button className="opt-btn opt-discharge" onClick={() => setDispositionType('discharge')}>
                                    <span className="icon">🏠</span>
                                    <span className="label">Discharge</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {renderFormContent()}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setDispositionType(''); setTransferNotes(''); }}
                                >
                                    Back
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Processing...' : 'Confirm Disposition'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmergencyDispositionModal;
