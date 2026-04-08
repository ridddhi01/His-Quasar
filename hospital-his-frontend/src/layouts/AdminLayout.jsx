import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import AdminGuard from '../components/guards/AdminGuard';
import './AdminLayout.css';

/**
 * Admin Layout
 * Separate layout from clinical dashboard
 * 
 * Design Principle: Clear visual separation
 * - Different color scheme (dark theme for admin)
 * - Admin-only navigation
 * - No clinical actions visible
 */

const AdminLayout = () => {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const navItems = [
        {
            section: 'Overview',
            items: [
                { path: '/admin', icon: '📊', label: 'Dashboard', end: true },
            ],
        },
        {
            section: 'User & Access',
            items: [
                { path: '/admin/users', icon: '👤', label: 'User Management' },
                { path: '/admin/break-glass', icon: '🔓', label: 'Break-Glass Access' },
                { path: '/admin/audit-logs', icon: '📜', label: 'Audit Logs' },
            ],
        },
        {
            section: 'Revenue & Compliance',
            items: [
                { path: '/admin/revenue-anomalies', icon: '💹', label: 'Revenue Anomalies' },
                { path: '/admin/incidents', icon: '⚠️', label: 'Incidents' },
                { path: '/admin/compliance', icon: '✅', label: 'Compliance' },
            ],
        },
        {
            section: 'Configuration',
            items: [
                { path: '/admin/master-data', icon: '⚙️', label: 'Master Data' },
                { path: '/admin/departments', icon: '🏥', label: 'Departments' },
                { path: '/admin/system', icon: '🖥️', label: 'System Health' },
            ],
        },
    ];

    return (
        <AdminGuard>
            <div className={`admin-layout ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {/* Sidebar */}
                <aside className="admin-sidebar">
                    <div className="sidebar-header">
                        <div className="logo">
                            <span className="logo-icon">🔒</span>
                            {!sidebarCollapsed && <span className="logo-text">Admin Portal</span>}
                        </div>
                        <button
                            className="collapse-btn"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        >
                            {sidebarCollapsed ? '→' : '←'}
                        </button>
                    </div>

                    <nav className="sidebar-nav">
                        {navItems.map((section, idx) => (
                            <div key={idx} className="nav-section">
                                {!sidebarCollapsed && (
                                    <span className="nav-section-title">{section.section}</span>
                                )}
                                <ul>
                                    {section.items.map((item) => (
                                        <li key={item.path}>
                                            <NavLink
                                                to={item.path}
                                                end={item.end}
                                                className={({ isActive }) =>
                                                    `nav-link ${isActive ? 'active' : ''}`
                                                }
                                            >
                                                <span className="nav-icon">{item.icon}</span>
                                                {!sidebarCollapsed && (
                                                    <span className="nav-label">{item.label}</span>
                                                )}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <button
                            className="btn-clinical"
                            onClick={() => navigate('/dashboard')}
                        >
                            {sidebarCollapsed ? '←' : '← Back to Clinical'}
                        </button>
                        <button className="btn-logout" onClick={handleLogout}>
                            {sidebarCollapsed ? '↪' : '↪ Logout'}
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="admin-main">
                    <header className="admin-header">
                        <div className="header-left">
                            <span className="mode-badge">🔒 GOVERNANCE MODE</span>
                        </div>
                        <div className="header-right">
                            <span className="user-info">
                                Admin
                            </span>
                        </div>
                    </header>

                    <div className="admin-content">
                        <Outlet />
                    </div>
                </main>
            </div>
        </AdminGuard>
    );
};

export default AdminLayout;
