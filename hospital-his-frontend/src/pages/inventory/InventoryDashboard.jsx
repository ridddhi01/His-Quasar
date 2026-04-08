/**
 * Inventory Dashboard
 * Main dashboard for Inventory Manager role
 * Displays real-time stock overview, alerts, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './InventoryDashboard.css';

const InventoryDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        totalItems: 0,
        activeVendors: 0,
        lowStockItems: 0,
        nearExpiryItems: 0,
        expiredItems: 0,
        pendingPRs: 0,
        pendingPOs: 0,
        pendingIssues: 0,
        pendingTransfers: 0,
        activeRecalls: 0,
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await inventoryManagerService.getDashboard();
            // Service already returns response.data, so response here has { success, data }
            if (response?.data) {
                setDashboardData(response.data);
            } else if (response) {
                // If response is the data directly
                setDashboardData(response);
            }
            setError(null);
        } catch (err) {
            setError('Failed to load dashboard data');
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon, color, onClick, badge }) => (
        <div
            className={`stat-card ${color}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className="stat-icon">{icon}</div>
            <div className="stat-content">
                <h3>{value}</h3>
                <p>{title}</p>
            </div>
            {badge > 0 && <span className="stat-badge">{badge}</span>}
        </div>
    );

    const QuickAction = ({ title, icon, onClick }) => (
        <button className="quick-action-btn" onClick={onClick}>
            <span className="action-icon">{icon}</span>
            <span className="action-title">{title}</span>
        </button>
    );

    if (loading) {
        return <div className="loading-container">Loading dashboard...</div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <p>{error}</p>
                <button onClick={fetchDashboardData}>Retry</button>
            </div>
        );
    }

    return (
        <div className="inventory-dashboard">
            <header className="dashboard-header">
                <h1>Inventory Management</h1>
                <p>Real-time overview of non-medicine inventory</p>
            </header>

            {/* Stats Overview */}
            <section className="stats-section">
                <h2>Overview</h2>
                <div className="stats-grid">
                    <StatCard
                        title="Total Items"
                        value={dashboardData.totalItems}
                        icon="📦"
                        color="blue"
                        onClick={() => navigate('/inventory/items')}
                    />
                    <StatCard
                        title="Active Vendors"
                        value={dashboardData.activeVendors}
                        icon="🏢"
                        color="purple"
                        onClick={() => navigate('/inventory/vendors')}
                    />
                    <StatCard
                        title="Low Stock"
                        value={dashboardData.lowStockItems}
                        icon="⚠️"
                        color="orange"
                        onClick={() => navigate('/inventory/stock/low-stock')}
                    />
                    <StatCard
                        title="Near Expiry"
                        value={dashboardData.nearExpiryItems}
                        icon="⏰"
                        color="yellow"
                        onClick={() => navigate('/inventory/stock/near-expiry')}
                    />
                </div>
            </section>

            {/* Alerts Section */}
            <section className="alerts-section">
                <h2>Alerts & Pending Actions</h2>
                <div className="alerts-grid">
                    {dashboardData.expiredItems > 0 && (
                        <div className="alert-card critical" onClick={() => navigate('/inventory/stock/expired')}>
                            <span className="alert-icon">🚨</span>
                            <div className="alert-content">
                                <strong>{dashboardData.expiredItems} Expired Items</strong>
                                <p>Items have passed expiry date and need action</p>
                            </div>
                        </div>
                    )}
                    {dashboardData.activeRecalls > 0 && (
                        <div className="alert-card critical" onClick={() => navigate('/inventory/recalls')}>
                            <span className="alert-icon">⛔</span>
                            <div className="alert-content">
                                <strong>{dashboardData.activeRecalls} Active Recalls</strong>
                                <p>Items under recall process</p>
                            </div>
                        </div>
                    )}
                    {dashboardData.pendingIssues > 0 && (
                        <div className="alert-card warning" onClick={() => navigate('/inventory/stock-issues')}>
                            <span className="alert-icon">📋</span>
                            <div className="alert-content">
                                <strong>{dashboardData.pendingIssues} Pending Issue Requests</strong>
                                <p>Stock issue requests awaiting approval</p>
                            </div>
                        </div>
                    )}
                    {dashboardData.pendingTransfers > 0 && (
                        <div className="alert-card info" onClick={() => navigate('/inventory/stock-transfers')}>
                            <span className="alert-icon">🔄</span>
                            <div className="alert-content">
                                <strong>{dashboardData.pendingTransfers} Pending Transfers</strong>
                                <p>Stock transfers in progress</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Procurement Section */}
            <section className="procurement-section">
                <h2>Procurement Pipeline</h2>
                <div className="pipeline-grid">
                    <div className="pipeline-card" onClick={() => navigate('/inventory/purchase-requisitions')}>
                        <div className="pipeline-count">{dashboardData.pendingPRs}</div>
                        <div className="pipeline-label">Pending PRs</div>
                    </div>
                    <div className="pipeline-arrow">→</div>
                    <div className="pipeline-card" onClick={() => navigate('/inventory/purchase-orders')}>
                        <div className="pipeline-count">{dashboardData.pendingPOs}</div>
                        <div className="pipeline-label">Open POs</div>
                    </div>
                    <div className="pipeline-arrow">→</div>
                    <div className="pipeline-card" onClick={() => navigate('/inventory/grns')}>
                        <div className="pipeline-count">-</div>
                        <div className="pipeline-label">Create GRN</div>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="quick-actions-section">
                <h2>Quick Actions</h2>
                <div className="quick-actions-grid">
                    <QuickAction
                        title="Add New Item"
                        icon="➕"
                        onClick={() => navigate('/inventory/items/new')}
                    />
                    <QuickAction
                        title="Create PO"
                        icon="📝"
                        onClick={() => navigate('/inventory/purchase-orders/new')}
                    />
                    <QuickAction
                        title="Receive Goods"
                        icon="📥"
                        onClick={() => navigate('/inventory/grns/new')}
                    />
                    <QuickAction
                        title="Issue Stock"
                        icon="📤"
                        onClick={() => navigate('/inventory/stock-issues/new')}
                    />
                    <QuickAction
                        title="Transfer Stock"
                        icon="🔄"
                        onClick={() => navigate('/inventory/stock-transfers/new')}
                    />
                    <QuickAction
                        title="View Audit Log"
                        icon="📊"
                        onClick={() => navigate('/inventory/audit')}
                    />
                </div>
            </section>
        </div>
    );
};

export default InventoryDashboard;
