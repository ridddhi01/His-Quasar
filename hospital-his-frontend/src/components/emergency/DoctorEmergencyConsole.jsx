
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import emergencyOrderSetService from '../../services/emergency.orderSet.service';
import EmergencyOrderSetSelector from './EmergencyOrderSetSelector';
import EmergencyDispositionModal from './EmergencyDispositionModal';
import './DoctorEmergencyConsole.css';

/**
 * Doctor Emergency Console
 * Specialized interface for doctors to manage treatment, bundles, and disposition
 */
const DoctorEmergencyConsole = ({ emergencyCase, onUpdate }) => {
    const [showBundleSelector, setShowBundleSelector] = useState(false);
    const [showDispositionModal, setShowDispositionModal] = useState(false);
    const dispatch = useDispatch(); // Need dispatch to update status

    // Filter bundles by type for indicators
    const appliedBundles = emergencyCase.appliedBundles || [];
    const hasTraumaBundle = appliedBundles.some(b => b.bundleCategory === 'trauma');
    const hasCardiacBundle = appliedBundles.some(b => b.bundleCategory === 'cardiac');
    const hasStrokeBundle = appliedBundles.some(b => b.bundleCategory === 'stroke');

    // Enforce Start Treatment
    if (emergencyCase.status !== 'in-treatment') {
        return (
            <div className="doctor-camera-console p-5 text-center">
                <div className="mb-4 text-gray-500">
                    <i className="fas fa-user-md text-4xl mb-2"></i>
                    <h3>Patient Treatment Not Started</h3>
                    <p>Please acknowledge the patient to begin clinical protocols.</p>
                </div>
                <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-lg hover:bg-blue-700 transition-colors"
                    onClick={async () => {
                        await emergencyOrderSetService.updateStatus(emergencyCase._id, 'in-treatment');
                        if (onUpdate) onUpdate();
                    }}
                >
                    Start Treatment
                </button>
            </div>
        );
    }

    return (
        <div className="doctor-camera-console">
            <div className="console-header">
                <h3><i className="fas fa-user-md"></i> Doctor's Console</h3>
                <div className="active-indicators">
                    {hasTraumaBundle && <span className="badge badge-warning">Trauma Protocol Active</span>}
                    {hasCardiacBundle && <span className="badge badge-danger">Cardiac Protocol Active</span>}
                    {hasStrokeBundle && <span className="badge badge-primary">Stroke Protocol Active</span>}
                    {emergencyCase.emergencyTag && !appliedBundles.length && (
                        <span className="badge badge-info uppercase">{emergencyCase.emergencyTag}</span>
                    )}
                </div>
            </div>

            <div className="console-actions">
                <button
                    className="action-card btn-apply-bundle"
                    onClick={() => setShowBundleSelector(true)}
                >
                    <div className="icon">⚡</div>
                    <div className="label">Apply Clinical Bundle</div>
                    <small>Order sets for Trauma, Cardiac, Stroke...</small>
                </button>

                <div className="action-divider"></div>

                <button
                    className="action-card btn-disposition"
                    onClick={() => setShowDispositionModal(true)}
                    disabled={!emergencyCase.treatmentStartTime} // Only if treatment started
                >
                    <div className="icon">🏥</div>
                    <div className="label">Disposition</div>
                    <small>Admit (IPD/ICU), Transfer (OT), Discharge</small>
                </button>
            </div>

            {/* Recent Bundles List */}
            {appliedBundles.length > 0 && (
                <div className="applied-bundles-section">
                    <h4>Applied Bundles</h4>
                    <div className="bundles-list">
                        {appliedBundles.map(bundle => (
                            <div key={bundle._id} className="applied-bundle-item">
                                <div className="bundle-info">
                                    <span className="bundle-name">{bundle.orderSet?.name || 'Unknown Bundle'}</span>
                                    <span className="bundle-time">
                                        {new Date(bundle.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="bundle-orders-summary">
                                    <span title="Lab Orders">🧪 {bundle.createdOrders?.labTests?.length || 0}</span>
                                    <span title="Radiology Orders">☢️ {bundle.createdOrders?.radiologyTests?.length || 0}</span>
                                    <span title="Prescriptions">💊 {bundle.createdOrders?.prescriptions?.length || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showBundleSelector && (
                <EmergencyOrderSetSelector
                    emergencyCaseId={emergencyCase._id}
                    onClose={() => setShowBundleSelector(false)}
                    onBundleApplied={() => {
                        if (onUpdate) onUpdate();
                    }}
                />
            )}

            {showDispositionModal && (
                <EmergencyDispositionModal
                    emergencyCase={emergencyCase}
                    onClose={() => setShowDispositionModal(false)}
                    onDispositionComplete={() => {
                        if (onUpdate) onUpdate();
                    }}
                />
            )}
        </div>
    );
};

export default DoctorEmergencyConsole;
