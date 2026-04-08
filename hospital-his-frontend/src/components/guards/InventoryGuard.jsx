/**
 * Inventory Manager Guard
 * Protects inventory routes for Inventory Manager role only
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const InventoryGuard = ({ children }) => {
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

    // Only allow inventory_manager role
    if (role !== 'inventory_manager') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default InventoryGuard;

