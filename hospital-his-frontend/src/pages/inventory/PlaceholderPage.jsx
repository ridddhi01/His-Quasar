/**
 * Inventory Placeholder Page
 * Shows "Coming Soon" for routes not yet implemented
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PlaceholderPage.css';

const PlaceholderPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Extract the feature name from the path
    const getFeatureName = () => {
        const path = location.pathname;
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 1) {
            return segments[segments.length - 1]
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
        return 'This Feature';
    };

    return (
        <div className="placeholder-page">
            <div className="placeholder-content">
                <div className="placeholder-icon">🚧</div>
                <h1>Coming Soon</h1>
                <p><strong>{getFeatureName()}</strong> is under development.</p>
                <p className="sub-text">This feature will be available in a future update.</p>
                <button onClick={() => navigate('/inventory')} className="back-btn">
                    ← Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default PlaceholderPage;
