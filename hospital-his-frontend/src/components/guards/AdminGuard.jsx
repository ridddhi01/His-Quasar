import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Admin Route Guard
 * Protects admin routes - only allows 'admin' role
 * 
 * Design Principle: UX enforces policy
 * - Non-admin users are redirected to their dashboard
 * - Clear messaging about access denial
 */

const AdminGuard = ({ children }) => {
    const location = useLocation();

    // Get user from localStorage
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

    // Check authentication
    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role
    const role = getUserRole();
    if (role !== 'admin') {
        return (
            <div className="access-denied">
                <div className="access-denied-content">
                    <span className="lock-icon">🔒</span>
                    <h2>Admin Access Required</h2>
                    <p>
                        This area is restricted to administrators only.
                        Your role ({role}) does not have permission to access this section.
                    </p>
                    <div className="access-denied-actions">
                        <button onClick={() => window.history.back()}>
                            ← Go Back
                        </button>
                        <a href="/dashboard">
                            Go to Dashboard
                        </a>
                    </div>
                </div>
                <style>{`
                    .access-denied {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 80vh;
                        padding: 24px;
                    }
                    .access-denied-content {
                        text-align: center;
                        max-width: 400px;
                        padding: 40px;
                        background: white;
                        border-radius: 16px;
                        box-shadow: 0 4px 24px rgba(0,0,0,0.1);
                    }
                    .lock-icon {
                        font-size: 64px;
                        display: block;
                        margin-bottom: 16px;
                    }
                    .access-denied h2 {
                        color: #1e293b;
                        margin: 0 0 12px 0;
                    }
                    .access-denied p {
                        color: #64748b;
                        margin: 0 0 24px 0;
                        line-height: 1.6;
                    }
                    .access-denied-actions {
                        display: flex;
                        gap: 12px;
                        justify-content: center;
                    }
                    .access-denied-actions button,
                    .access-denied-actions a {
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-weight: 500;
                        cursor: pointer;
                        text-decoration: none;
                        transition: all 0.2s;
                    }
                    .access-denied-actions button {
                        background: #f1f5f9;
                        border: 1px solid #e2e8f0;
                        color: #475569;
                    }
                    .access-denied-actions button:hover {
                        background: #e2e8f0;
                    }
                    .access-denied-actions a {
                        background: #3b82f6;
                        color: white;
                        border: none;
                    }
                    .access-denied-actions a:hover {
                        background: #2563eb;
                    }
                `}</style>
            </div>
        );
    }

    return children;
};

export default AdminGuard;
