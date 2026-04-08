
import React, { useState, useEffect } from 'react';
import './EmergencyBundlePreview.css';

/**
 * Emergency Bundle Preview Component
 * Allows doctor to review and modify selected bundle items before applying
 */
const EmergencyBundlePreview = ({ bundle, onConfirm, onCancel }) => {
    const [selectedInvestigations, setSelectedInvestigations] = useState([]);
    const [selectedMedications, setSelectedMedications] = useState([]);
    const [selectedProcedures, setSelectedProcedures] = useState([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (bundle) {
            // Initialize selections with all items included by default
            setSelectedInvestigations(
                bundle.investigations.map(item => ({
                    ...item,
                    included: item.isRequired !== false // Default to true unless explicitly not required
                }))
            );

            setSelectedMedications(
                bundle.medications.map(item => ({
                    ...item,
                    included: item.isRequired !== false
                }))
            );

            setSelectedProcedures(
                bundle.procedures.map(item => ({
                    ...item,
                    included: item.isRequired !== false
                }))
            );
        }
    }, [bundle]);

    const toggleInvestigation = (index) => {
        const updated = [...selectedInvestigations];
        updated[index].included = !updated[index].included;
        setSelectedInvestigations(updated);
    };

    const toggleMedication = (index) => {
        const updated = [...selectedMedications];
        updated[index].included = !updated[index].included;
        setSelectedMedications(updated);
    };

    const toggleProcedure = (index) => {
        const updated = [...selectedProcedures];
        updated[index].included = !updated[index].included;
        setSelectedProcedures(updated);
    };

    const handleConfirm = () => {
        onConfirm({
            orderSetId: bundle._id,
            selectedInvestigations: selectedInvestigations.filter(i => i.included),
            selectedMedications: selectedMedications.filter(m => m.included),
            selectedProcedures: selectedProcedures.filter(p => p.included),
            notes
        });
    };

    if (!bundle) return null;

    return (
        <div className="emergency-bundle-preview">
            <div className="bundle-header">
                <h3>{bundle.name}</h3>
                <span className={`bundle-tag tag-${bundle.subCategory}`}>
                    {bundle.subCategory.toUpperCase()}
                </span>
            </div>

            <p className="bundle-description">{bundle.description}</p>

            <div className="bundle-content">
                {/* Investigations Section */}
                {selectedInvestigations.length > 0 && (
                    <div className="bundle-section">
                        <h4>Investigations (Lab & Radiology)</h4>
                        <div className="bundle-items-list">
                            {selectedInvestigations.map((item, index) => (
                                <div key={`inv-${index}`} className={`bundle-item ${item.included ? 'selected' : ''}`}>
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={item.included}
                                            onChange={() => toggleInvestigation(index)}
                                            disabled={item.isRequired}
                                        />
                                        <span className="checkmark"></span>
                                        <div className="item-details">
                                            <span className="item-name">
                                                {item.testType === 'LabTestMaster' ? '🧪 ' : '☢️ '}
                                                {item.test?.testName || item.testName}
                                            </span>
                                            <span className="item-priority badge badge-sm badge-danger">
                                                {item.priority?.toUpperCase()}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Medications Section */}
                {selectedMedications.length > 0 && (
                    <div className="bundle-section">
                        <h4>Medications (Pharmacy)</h4>
                        <div className="bundle-items-list">
                            {selectedMedications.map((item, index) => (
                                <div key={`med-${index}`} className={`bundle-item ${item.included ? 'selected' : ''}`}>
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={item.included}
                                            onChange={() => toggleMedication(index)}
                                            disabled={item.isRequired}
                                        />
                                        <span className="checkmark"></span>
                                        <div className="item-details">
                                            <span className="item-name">💊 {item.medicine?.name || item.medicineName}</span>
                                            <span className="item-meta">
                                                {item.dosage} • {item.route} • {item.frequency}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Procedures Section */}
                {selectedProcedures.length > 0 && (
                    <div className="bundle-section">
                        <h4>Procedures</h4>
                        <div className="bundle-items-list">
                            {selectedProcedures.map((item, index) => (
                                <div key={`proc-${index}`} className={`bundle-item ${item.included ? 'selected' : ''}`}>
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={item.included}
                                            onChange={() => toggleProcedure(index)}
                                            disabled={item.isRequired}
                                        />
                                        <span className="checkmark"></span>
                                        <div className="item-details">
                                            <span className="item-name">🩺 {item.procedureName}</span>
                                            <span className="item-priority badge badge-sm">
                                                {item.priority?.toUpperCase()}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Application Notes */}
                <div className="bundle-section">
                    <h4>Clinical Notes</h4>
                    <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Add specific instructions or clinical context for this bundle application..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                </div>
            </div>

            <div className="bundle-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleConfirm}>
                    Confirm & Apply Bundle
                </button>
            </div>
        </div>
    );
};

export default EmergencyBundlePreview;
