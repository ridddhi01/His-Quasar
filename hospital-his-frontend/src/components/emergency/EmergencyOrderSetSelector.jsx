
import React, { useState, useEffect } from 'react';
import emergencyOrderSetService from '../../services/emergency.orderSet.service';
import EmergencyBundlePreview from './EmergencyBundlePreview';
import './EmergencyOrderSetSelector.css';

/**
 * Emergency Order Set Selector
 * Modal component for selecting and applying clinical bundles
 */
const EmergencyOrderSetSelector = ({ emergencyCaseId, onClose, onBundleApplied }) => {
    const [step, setStep] = useState('select'); // 'select', 'trauma-level', 'preview'
    const [categories] = useState([
        { id: 'cardiac', label: 'Cardiac', icon: '🫀', class: 'card-cardiac' },
        { id: 'stroke', label: 'Stroke', icon: '🧠', class: 'card-stroke' },
        { id: 'trauma', label: 'Trauma', icon: '🚑', class: 'card-trauma' },
        { id: 'sepsis', label: 'Sepsis', icon: '🦠', class: 'card-sepsis' },
        { id: 'respiratory', label: 'Respiratory', icon: '🫁', class: 'card-respiratory' },
        { id: 'pediatric', label: 'Pediatric', icon: '👶', class: 'card-pediatric' },
        { id: 'obstetric', label: 'Obstetric', icon: '🤰', class: 'card-obstetric' },
        { id: 'general', label: 'General', icon: '🏥', class: 'card-general' }
    ]);

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [availableBundles, setAvailableBundles] = useState([]);
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [traumaLevel, setTraumaLevel] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch bundles when category changes (except for trauma which needs level first)
    useEffect(() => {
        if (selectedCategory && selectedCategory !== 'trauma') {
            loadBundles(selectedCategory);
        } else if (selectedCategory === 'trauma') {
            setStep('trauma-level');
        }
    }, [selectedCategory]);

    const loadBundles = async (category) => {
        setLoading(true);
        try {
            const bundles = await emergencyOrderSetService.getAvailableBundles(category);
            setAvailableBundles(bundles);
            // Auto-select first bundle if only one exists
            if (bundles.length === 1) {
                setSelectedBundle(bundles[0]);
                setStep('preview');
            } else if (bundles.length > 1) {
                setStep('bundle-list');
            } else {
                alert(`No bundles found for ${category}`);
                setStep('select');
                setSelectedCategory(null);
            }
        } catch (error) {
            console.error("Error loading bundles:", error);
            alert("Failed to load bundles. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleTraumaLevelSelect = async (level) => {
        setTraumaLevel(level);
        setLoading(true);
        try {
            const bundle = await emergencyOrderSetService.getTraumaBundleByLevel(level);
            if (bundle) {
                setSelectedBundle(bundle);
                setStep('preview');
            } else {
                alert(`Trauma Level ${level} bundle not configured.`);
                setStep('trauma-level');
            }
        } catch (error) {
            console.error("Error loading trauma bundle:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyBundle = async (bundleData) => {
        setLoading(true);
        try {
            const result = await emergencyOrderSetService.applyBundle(emergencyCaseId, {
                ...bundleData,
                traumaLevel // Include if set
            });

            if (onBundleApplied) onBundleApplied(result);
            onClose();
        } catch (error) {
            console.error("Error applying bundle:", error);
            alert("Failed to apply bundle: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const renderCategorySelection = () => (
        <div className="category-grid">
            {categories.map(cat => (
                <div
                    key={cat.id}
                    className={`category-card ${cat.class}`}
                    onClick={() => setSelectedCategory(cat.id)}
                >
                    <div className="cat-icon">{cat.icon}</div>
                    <div className="cat-label">{cat.label}</div>
                </div>
            ))}
        </div>
    );

    const renderTraumaLevelSelection = () => (
        <div className="trauma-levels">
            <h3>Select Trauma Activation Level</h3>
            <div className="level-cards">
                <div className="level-card level-1" onClick={() => handleTraumaLevelSelect(1)}>
                    <div className="level-badge">LEVEL 1</div>
                    <h4>Critical / Life Threatening</h4>
                    <p>Full Trauma Team Activation</p>
                    <ul>
                        <li>Unstable Vitals</li>
                        <li>GCS &lt; 8</li>
                        <li>Gunshot / Stab Wounds</li>
                    </ul>
                </div>
                <div className="level-card level-2" onClick={() => handleTraumaLevelSelect(2)}>
                    <div className="level-badge">LEVEL 2</div>
                    <h4>Serious / Potential Life Threat</h4>
                    <p>Modified Trauma Response</p>
                    <ul>
                        <li>Stable Vitals</li>
                        <li>Two or more long bone fx</li>
                        <li>High mechanism of injury</li>
                    </ul>
                </div>
                <div className="level-card level-3" onClick={() => handleTraumaLevelSelect(3)}>
                    <div className="level-badge">LEVEL 3</div>
                    <h4>Moderate / Non-Critical</h4>
                    <p>Standard ER Evaluation</p>
                    <ul>
                        <li>Single system injury</li>
                        <li>Stable vitals</li>
                        <li>Falls from standing height</li>
                    </ul>
                </div>
            </div>
            <button className="btn btn-text mt-3" onClick={() => { setStep('select'); setSelectedCategory(null); }}>
                ← Back to Categories
            </button>
        </div>
    );

    const renderBundleList = () => (
        <div className="bundle-list-view">
            <h3>Select Specific Bundle</h3>
            <div className="list-group">
                {availableBundles.map(bundle => (
                    <div
                        key={bundle._id}
                        className="list-group-item list-group-item-action"
                        onClick={() => { setSelectedBundle(bundle); setStep('preview'); }}
                    >
                        <div className="d-flex w-100 justify-content-between">
                            <h5 className="mb-1">{bundle.name}</h5>
                            <small>{bundle.subCategory}</small>
                        </div>
                        <p className="mb-1">{bundle.description}</p>
                    </div>
                ))}
            </div>
            <button className="btn btn-text mt-3" onClick={() => { setStep('select'); setSelectedCategory(null); }}>
                ← Back to Categories
            </button>
        </div>
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content order-set-modal">
                <div className="modal-header">
                    <h2>Emergency Order Sets</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {loading && <div className="loading-spinner">Loading...</div>}

                    {!loading && step === 'select' && renderCategorySelection()}
                    {!loading && step === 'trauma-level' && renderTraumaLevelSelection()}
                    {!loading && step === 'bundle-list' && renderBundleList()}
                    {!loading && step === 'preview' && selectedBundle && (
                        <EmergencyBundlePreview
                            bundle={selectedBundle}
                            onConfirm={handleApplyBundle}
                            onCancel={() => {
                                if (selectedCategory === 'trauma') setStep('trauma-level');
                                else if (availableBundles.length > 1) setStep('bundle-list');
                                else { setStep('select'); setSelectedCategory(null); }
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmergencyOrderSetSelector;
