import React from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle, AlertCircle, Info, Shield, XCircle,
    Pill, Stethoscope, HeartPulse, X, Check
} from 'lucide-react';

/**
 * SafetyAlerts Component
 * 
 * Displays drug interaction and allergy warnings.
 * Shows severity levels and allows doctor override.
 */

export const SafetyAlerts = ({
    interactions = [],
    allergyConflicts = [],
    hasMajor = false,
    onOverride,
    overrideComplete = false,
    showOverrideButton = false,
}) => {
    if (interactions.length === 0 && allergyConflicts.length === 0) {
        return (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <Shield size={18} />
                <span className="font-medium">No interactions or allergy warnings detected</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Allergy Conflicts - Always Critical */}
            {allergyConflicts.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <XCircle className="text-red-600" size={20} />
                        <h4 className="font-bold text-red-800">Allergy Warnings</h4>
                    </div>
                    <div className="space-y-2">
                        {allergyConflicts.map((conflict, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200"
                            >
                                <HeartPulse className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="font-medium text-red-800">
                                        {conflict.medicineName}
                                    </p>
                                    <p className="text-sm text-red-600">
                                        Patient allergic to: <b>{conflict.allergy}</b>
                                    </p>
                                    <p className="text-xs text-red-400 mt-1">
                                        Match type: {conflict.matchType}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Drug Interactions */}
            {interactions.length > 0 && (
                <div className="space-y-3">
                    {/* Major Interactions */}
                    {interactions.filter(i => i.severity === 'major').length > 0 && (
                        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="text-red-600" size={20} />
                                <h4 className="font-bold text-red-800">Major Interactions</h4>
                                <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs font-bold ml-auto">
                                    REQUIRES OVERRIDE
                                </span>
                            </div>
                            <div className="space-y-2">
                                {interactions.filter(i => i.severity === 'major').map((interaction, idx) => (
                                    <InteractionCard key={idx} interaction={interaction} severity="major" />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Moderate Interactions */}
                    {interactions.filter(i => i.severity === 'moderate').length > 0 && (
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="text-orange-600" size={20} />
                                <h4 className="font-bold text-orange-800">Moderate Interactions</h4>
                            </div>
                            <div className="space-y-2">
                                {interactions.filter(i => i.severity === 'moderate').map((interaction, idx) => (
                                    <InteractionCard key={idx} interaction={interaction} severity="moderate" />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Minor Interactions */}
                    {interactions.filter(i => i.severity === 'minor').length > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Info className="text-yellow-600" size={20} />
                                <h4 className="font-bold text-yellow-800">Minor Interactions</h4>
                            </div>
                            <div className="space-y-2">
                                {interactions.filter(i => i.severity === 'minor').map((interaction, idx) => (
                                    <InteractionCard key={idx} interaction={interaction} severity="minor" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Override Button */}
            {showOverrideButton && hasMajor && !overrideComplete && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                        <b>Doctor Override Required:</b> Major interactions or allergy warnings require
                        physician approval before dispensing.
                    </p>
                    <button
                        onClick={onOverride}
                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                        <Shield size={18} />
                        Override with Reason (Doctor Only)
                    </button>
                </div>
            )}

            {/* Override Complete */}
            {overrideComplete && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    <Check size={18} />
                    <span className="font-medium">Doctor override recorded - proceed with caution</span>
                </div>
            )}
        </div>
    );
};

/**
 * Individual Interaction Card
 */
const InteractionCard = ({ interaction, severity }) => {
    const colors = {
        major: { bg: 'bg-white', border: 'border-red-200', text: 'text-red-800', subtext: 'text-red-600' },
        moderate: { bg: 'bg-white', border: 'border-orange-200', text: 'text-orange-800', subtext: 'text-orange-600' },
        minor: { bg: 'bg-white', border: 'border-yellow-200', text: 'text-yellow-800', subtext: 'text-yellow-600' },
    };
    const color = colors[severity];

    return (
        <div className={`p-3 ${color.bg} rounded-lg border ${color.border}`}>
            <div className="flex items-start gap-3">
                <Pill className={color.subtext} size={18} />
                <div className="flex-1">
                    <p className={`font-medium ${color.text}`}>
                        {interaction.drug1?.name || interaction.drug1} ↔ {interaction.drug2?.name || interaction.drug2}
                    </p>
                    <p className={`text-sm ${color.subtext} mt-1`}>
                        {interaction.description}
                    </p>
                    {interaction.clinicalEffect && (
                        <p className="text-sm text-gray-500 mt-1">
                            <b>Effect:</b> {interaction.clinicalEffect}
                        </p>
                    )}
                    {interaction.recommendation && (
                        <p className="text-sm text-gray-500 mt-1">
                            <b>Recommendation:</b> {interaction.recommendation}
                        </p>
                    )}

                    {/* Override info if exists */}
                    {interaction.overrideBy && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                            ✓ Overridden: {interaction.overrideReason}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Override Modal Component
 */
export const OverrideModal = ({ onSubmit, onClose }) => {
    const [reason, setReason] = React.useState('');

    const handleSubmit = () => {
        if (reason.trim().length < 10) {
            alert('Please provide a detailed reason (min 10 characters)');
            return;
        }
        onSubmit(reason);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield />
                        Doctor Override Required
                    </h2>
                    <p className="text-red-100 mt-1">
                        Document clinical justification for override
                    </p>
                </div>

                <div className="p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-700">
                            <b>Warning:</b> You are overriding a major drug interaction or allergy warning.
                            This action requires clinical justification and will be recorded in the audit log.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Clinical Justification *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Enter detailed reason for override (e.g., 'Patient has tolerated this combination previously without adverse effects. Close monitoring ordered.')"
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Minimum 10 characters required
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2"
                    >
                        <Check size={18} />
                        Confirm Override
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SafetyAlerts;
