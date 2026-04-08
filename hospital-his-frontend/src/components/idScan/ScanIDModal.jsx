/**
 * Scan ID Modal Component
 * =======================
 * Modal for scanning government ID cards and extracting patient details.
 * Orchestrates camera capture, AI extraction, and result display.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scan, AlertCircle, CheckCircle, Loader2, User, Calendar, Shield } from 'lucide-react';
import CameraCapture from './CameraCapture';
import idScanService from '../../services/idScan.service';

const ScanIDModal = ({ isOpen, onClose, onExtracted }) => {
    const [step, setStep] = useState('capture'); // 'capture', 'processing', 'result', 'error'
    const [extractedData, setExtractedData] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Handle captured image from CameraCapture
     */
    const handleImageCaptured = async (imageFile) => {
        setStep('processing');
        setError(null);

        try {
            // Send to backend for AI extraction
            const result = await idScanService.scanIdCard(imageFile);

            if (result.success) {
                setExtractedData(result.data);
                setStep('result');
            } else {
                setError(result.error || 'Failed to extract details from ID card');
                setStep('error');
            }
        } catch (err) {
            console.error('Scan error:', err);
            setError('An unexpected error occurred. Please try again.');
            setStep('error');
        }
    };

    /**
     * Confirm extracted data and pass to parent
     */
    const handleConfirm = () => {
        if (extractedData && onExtracted) {
            onExtracted(extractedData);
        }
        handleClose();
    };

    /**
     * Reset and close modal
     */
    const handleClose = () => {
        setStep('capture');
        setExtractedData(null);
        setError(null);
        onClose();
    };

    /**
     * Retry scanning
     */
    const handleRetry = () => {
        setStep('capture');
        setExtractedData(null);
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={handleClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                                <Scan size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Scan ID Card</h2>
                                <p className="text-xs text-gray-500">Extract patient details automatically</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/70 rounded-full text-gray-500 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        {/* Step: Capture */}
                        {step === 'capture' && (
                            <CameraCapture
                                onCapture={handleImageCaptured}
                                onCancel={handleClose}
                            />
                        )}

                        {/* Step: Processing */}
                        {step === 'processing' && (
                            <div className="py-12 text-center space-y-4">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    className="inline-block"
                                >
                                    <Loader2 size={48} className="text-blue-600" />
                                </motion.div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700">Processing ID Card</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        AI is extracting details from your ID...
                                    </p>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                    <Shield size={14} />
                                    <span>Aadhaar number will be automatically masked</span>
                                </div>
                            </div>
                        )}

                        {/* Step: Result */}
                        {step === 'result' && extractedData && (
                            <div className="space-y-4">
                                {/* Success indicator */}
                                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <CheckCircle className="text-emerald-600" size={24} />
                                    <div>
                                        <p className="font-medium text-emerald-800">Details Extracted Successfully</p>
                                        <p className="text-xs text-emerald-600">
                                            Confidence: {extractedData.confidence === 'high' ? 'High' : 'Low - please verify'}
                                        </p>
                                    </div>
                                </div>

                                {/* Extracted data preview */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Extracted Information</h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-start gap-2">
                                            <User size={16} className="text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500">Full Name</p>
                                                <p className="font-medium text-slate-700">
                                                    {extractedData.firstName || '-'} {extractedData.lastName || ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <Calendar size={16} className="text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500">Date of Birth</p>
                                                <p className="font-medium text-slate-700">
                                                    {extractedData.dateOfBirth || '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <User size={16} className="text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500">Gender</p>
                                                <p className="font-medium text-slate-700">
                                                    {extractedData.gender || '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <Shield size={16} className="text-gray-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500">Aadhaar (Masked)</p>
                                                <p className="font-medium text-slate-700 font-mono">
                                                    {extractedData.maskedAadhaar || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Low confidence warning */}
                                {extractedData.confidence === 'low' && (
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                        <p>Some fields may need manual verification. Please review before confirming.</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleRetry}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        Scan Again
                                    </button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleConfirm}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/30"
                                    >
                                        Use These Details
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {/* Step: Error */}
                        {step === 'error' && (
                            <div className="py-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle size={32} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700">Extraction Failed</h3>
                                    <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                                        {error || 'Unable to extract details from the ID card.'}
                                    </p>
                                </div>
                                <div className="flex gap-3 justify-center pt-2">
                                    <button
                                        onClick={handleClose}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRetry}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer info */}
                    {step === 'capture' && (
                        <div className="px-5 pb-4">
                            <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                                <Shield size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700">
                                    <strong>Privacy Protected:</strong> Aadhaar numbers are automatically masked.
                                    Only last 4 digits are stored.
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ScanIDModal;
