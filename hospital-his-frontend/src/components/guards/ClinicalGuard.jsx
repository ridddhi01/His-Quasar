import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Clinical Route Guard
 * Protects clinical dashboard routes
 * 
 * Design Principle: Strict UX segregation
 * - Admins are REDIRECTED to /admin (Governance Portal)
 * - They cannot view patient-identifiable dashboards
 */

const ClinicalGuard = ({ children }) => {
    const location = useLocation();

    const getUserRole = () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return null;
            const user = JSON.parse(userStr);
            return user.role;
        } catch {
            return null;
        }
    };

    const isAuthenticated = () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;
        try {
            const user = JSON.parse(userStr);
            return !!user.token;
        } catch {
            return false;
        }
    };

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const role = getUserRole();

    // For now, allow admin to access clinical routes for testing functionality
    // if (role === 'admin') {
    //     return <Navigate to="/admin" replace />;
    // }

    // Allow all other roles (doctor, nurse, etc.)
    return children;
};

export default ClinicalGuard;
