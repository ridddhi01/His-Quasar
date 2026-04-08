/**
 * Camera Capture Component
 * ========================
 * Handles camera capture and file upload for ID card scanning.
 * Provides both webcam capture and file upload options.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, RefreshCw, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const CameraCapture = ({ onCapture, onCancel }) => {
    const [mode, setMode] = useState('select'); // 'select', 'camera', 'preview'
    const [capturedImage, setCapturedImage] = useState(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    /**
     * Start webcam capture
     */
    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Prefer back camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setMode('camera');
        } catch (err) {
            console.error('Camera error:', err);
            setError('Unable to access camera. Please use file upload instead.');
        }
    };

    /**
     * Stop webcam stream
     */
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    /**
     * Capture frame from video
     */
    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Convert to blob
        canvas.toBlob((blob) => {
            const file = new File([blob], 'captured_id.jpg', { type: 'image/jpeg' });
            setCapturedImage({
                file,
                preview: URL.createObjectURL(blob)
            });
            stopCamera();
            setMode('preview');
        }, 'image/jpeg', 0.9);
    };

    /**
     * Handle file selection
     */
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCapturedImage({
                file,
                preview: URL.createObjectURL(file)
            });
            setMode('preview');
        }
    };

    /**
     * Confirm and return captured image
     */
    const confirmCapture = () => {
        if (capturedImage) {
            onCapture(capturedImage.file);
        }
    };

    /**
     * Retake photo
     */
    const retake = () => {
        if (capturedImage?.preview) {
            URL.revokeObjectURL(capturedImage.preview);
        }
        setCapturedImage(null);
        setMode('select');
    };

    /**
     * Cancel and cleanup
     */
    const handleCancel = () => {
        stopCamera();
        if (capturedImage?.preview) {
            URL.revokeObjectURL(capturedImage.preview);
        }
        onCancel();
    };

    return (
        <div className="space-y-4">
            {/* Error message */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Mode: Select capture method */}
            {mode === 'select' && (
                <div className="space-y-4">
                    <p className="text-gray-600 text-sm text-center">
                        Choose how to capture the ID card image
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={startCamera}
                            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl hover:border-blue-400 transition-all"
                        >
                            <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                <Camera size={28} />
                            </div>
                            <span className="font-medium text-blue-700">Use Camera</span>
                            <span className="text-xs text-blue-500">Capture live</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl hover:border-emerald-400 transition-all"
                        >
                            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                <Upload size={28} />
                            </div>
                            <span className="font-medium text-emerald-700">Upload File</span>
                            <span className="text-xs text-emerald-500">Select image</span>
                        </motion.button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            )}

            {/* Mode: Camera view */}
            {mode === 'camera' && (
                <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay guide */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="border-2 border-dashed border-white/50 rounded-lg w-4/5 h-3/4" />
                        </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={captureFrame}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                        >
                            <Camera size={20} />
                            Capture
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Mode: Preview captured image */}
            {mode === 'preview' && capturedImage && (
                <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video">
                        <img
                            src={capturedImage.preview}
                            alt="Captured ID"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={retake}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw size={18} />
                            Retake
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={confirmCapture}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg"
                        >
                            <Check size={20} />
                            Use This Image
                        </motion.button>
                    </div>
                </div>
            )}

            {/* Cancel button for select mode */}
            {mode === 'select' && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
};

export default CameraCapture;
