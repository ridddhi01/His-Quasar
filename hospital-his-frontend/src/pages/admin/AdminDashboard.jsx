import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getDashboard,
    getDashboardKPIs,
    getAlerts,
    acknowledgeAlert
} from '../../services/admin.service';
import './AdminDashboard.css';

/**
 * Admin Dashboard
 * Governance overview with KPIs, alerts, and operational metrics
 * 
 * Design Principle: Patterns, not Patients
 * All data is aggregated - no patient-identifiable information
 */

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboard();
        // Refresh every 5 minutes
        const interval = setInterval(loadDashboard, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const [dashData, alertData] = await Promise.all([
                getDashboard(),
                getAlerts()
            ]);
            setDashboardData(dashData.data);
            setAlerts(alertData.data?.alerts || []);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (alertType) => {
        try {
            await acknowledgeAlert(alertType, 'Acknowledged from dashboard');
            loadDashboard();
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading && !dashboardData) {
        return (
            <div className="admin-dashboard loading">
                <div className="loading-spinner"></div>
                <p>Loading Admin Dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard error">
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <p>{error}</p>
                    <button onClick={loadDashboard}>Retry</button>
                </div>
            </div>
        );
    }

    const { revenue, bedOccupancy, erMetrics, incidents, compliance, users, system } = dashboardData || {};

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-title">
                    <h1>🔒 Admin Governance Dashboard</h1>
                    <span className="header-subtitle">Patterns, not Patients</span>
                </div>
                <div className="header-actions">
                    <button className="btn-refresh" onClick={loadDashboard} disabled={loading}>
                        {loading ? '⟳' : '↻'} Refresh
                    </button>
                    <span className="last-updated">
                        Last updated: {new Date().toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="alerts-banner">
                    <h3>🔔 Active Alerts ({alerts.length})</h3>
                    <div className="alerts-list">
                        {alerts.slice(0, 5).map((alert, idx) => (
                            <div key={idx} className={`alert-item severity-${alert.severity}`}>
                                <span className="alert-icon">
                                    {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢'}
                                </span>
                                <span className="alert-message">{alert.message}</span>
                                <button
                                    className="btn-acknowledge"
                                    onClick={() => handleAcknowledge(alert.type)}
                                >
                                    Acknowledge
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card revenue">
                    <div className="kpi-icon">💰</div>
                    <div className="kpi-content">
                        <span className="kpi-label">Monthly Revenue</span>
                        <span className="kpi-value">{formatCurrency(revenue?.currentMonthRevenue)}</span>
                        <span className={`kpi-trend ${revenue?.revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
                            {revenue?.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(revenue?.revenueGrowth || 0)}%
                        </span>
                    </div>
                </div>

                <div className="kpi-card beds">
                    <div className="kpi-icon">🛏️</div>
                    <div className="kpi-content">
                        <span className="kpi-label">Bed Occupancy</span>
                        <span className="kpi-value">{bedOccupancy?.summary?.overallOccupancyRate || 0}%</span>
                        <span className="kpi-sub">
                            {bedOccupancy?.summary?.available || 0} available
                        </span>
                    </div>
                </div>

                <div className="kpi-card er">
                    <div className="kpi-icon">🚨</div>
                    <div className="kpi-content">
                        <span className="kpi-label">ER Wait Time</span>
                        <span className="kpi-value">{erMetrics?.averageWaitTimeMinutes || 0} min</span>
                        <span className={`kpi-status status-${erMetrics?.congestionLevel || 'normal'}`}>
                            {erMetrics?.congestionLevel?.toUpperCase() || 'NORMAL'}
                        </span>
                    </div>
                </div>

                <div className="kpi-card compliance">
                    <div className="kpi-icon">✅</div>
                    <div className="kpi-content">
                        <span className="kpi-label">Compliance Score</span>
                        <span className="kpi-value">{compliance?.overallScore || 0}/100</span>
                        <span className={`kpi-status status-${compliance?.status || 'compliant'}`}>
                            {compliance?.status?.toUpperCase() || 'COMPLIANT'}
                        </span>
                    </div>
                </div>

                <div className="kpi-card pending">
                    <div className="kpi-icon">📋</div>
                    <div className="kpi-content">
                        <span className="kpi-label">Pending Collection</span>
                        <span className="kpi-value">{formatCurrency(revenue?.pendingCollection)}</span>
                        <span className="kpi-sub">{revenue?.pendingBillCount || 0} bills</span>
                    </div>
                </div>

                <div className="kpi-card users">
                    <div className="kpi-icon">👥</div>
                    <div className="kpi-content">
                        <span className="kpi-label">Active Users (24h)</span>
                        <span className="kpi-value">{users?.summary?.loggedInLast24h || 0}</span>
                        <span className="kpi-sub">{users?.summary?.locked || 0} locked</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                    <button
                        className="action-card"
                        onClick={() => navigate('/admin/users')}
                    >
                        <span className="action-icon">👤</span>
                        <span>User Management</span>
                    </button>
                    <button
                        className="action-card"
                        onClick={() => navigate('/admin/break-glass')}
                    >
                        <span className="action-icon">🔓</span>
                        <span>Break-Glass</span>
                    </button>
                    <button
                        className="action-card"
                        onClick={() => navigate('/admin/revenue-anomalies')}
                    >
                        <span className="action-icon">💹</span>
                        <span>Revenue Anomalies</span>
                    </button>
                    <button
                        className="action-card"
                        onClick={() => navigate('/admin/audit-logs')}
                    >
                        <span className="action-icon">📜</span>
                        <span>Audit Logs</span>
                    </button>
                    <button
                        className="action-card"
                        onClick={() => navigate('/admin/master-data')}
                    >
                        <span className="action-icon">⚙️</span>
                        <span>Master Data</span>
                    </button>
                    <button
                        className="action-card"
                        onClick={() => navigate('/admin/system')}
                    >
                        <span className="action-icon">🖥️</span>
                        <span>System Health</span>
                    </button>
                </div>
            </div>

            {/* Section Cards */}
            <div className="sections-grid">
                {/* Incidents Summary */}
                <div className="section-card">
                    <div className="section-header">
                        <h3>⚠️ Incidents & Safety</h3>
                        <button onClick={() => navigate('/admin/incidents')}>View All →</button>
                    </div>
                    <div className="section-content">
                        <div className="stat-row">
                            <span>Total Incidents (MTD)</span>
                            <span className="stat-value">{incidents?.summary?.totalIncidents || 0}</span>
                        </div>
                        <div className="stat-row">
                            <span>Break-Glass Usage</span>
                            <span className="stat-value">{incidents?.summary?.breakGlassUsage || 0}</span>
                        </div>
                        <div className="stat-row">
                            <span>Security Incidents</span>
                            <span className="stat-value">{incidents?.summary?.securityIncidents || 0}</span>
                        </div>
                        <div className="stat-row highlight">
                            <span>Days Since Last Incident</span>
                            <span className="stat-value">{incidents?.summary?.daysSinceLastIncident || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Compliance Areas */}
                <div className="section-card">
                    <div className="section-header">
                        <h3>✅ Compliance Status</h3>
                    </div>
                    <div className="section-content">
                        {compliance?.areas?.map((area, idx) => (
                            <div key={idx} className={`stat-row status-row ${area.status}`}>
                                <span>{area.name}</span>
                                <span className={`status-badge ${area.status}`}>
                                    {area.status === 'compliant' ? '✓' : area.status === 'warning' ? '⚠' : '✗'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Health */}
                <div className="section-card">
                    <div className="section-header">
                        <h3>🖥️ System Health</h3>
                    </div>
                    <div className="section-content">
                        <div className="stat-row">
                            <span>Status</span>
                            <span className={`status-badge ${system?.status}`}>
                                {system?.status?.toUpperCase() || 'HEALTHY'}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span>Uptime</span>
                            <span className="stat-value">{system?.uptime?.formatted || '0d 0h 0m'}</span>
                        </div>
                        <div className="stat-row">
                            <span>Memory Usage</span>
                            <span className="stat-value">
                                {system?.memory?.used || 0} / {system?.memory?.total || 0} MB
                            </span>
                        </div>
                        <div className="stat-row">
                            <span>Database</span>
                            <span className={`status-badge ${system?.database}`}>
                                {system?.database?.toUpperCase() || 'HEALTHY'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Notice */}
            <div className="dashboard-footer">
                <p>
                    <strong>🔒 Governance Mode:</strong> This dashboard shows aggregate operational metrics only.
                    Patient-identifiable information is not accessible from Admin role.
                </p>
            </div>
        </div>
    );
};

export default AdminDashboard;
