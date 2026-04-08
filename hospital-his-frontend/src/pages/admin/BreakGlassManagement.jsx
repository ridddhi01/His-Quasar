import React, { useState, useEffect } from 'react';
import {
    getBreakGlassPending,
    getBreakGlassActive,
    getBreakGlassPendingReview,
    approveBreakGlass,
    rejectBreakGlass,
    revokeBreakGlass,
    reviewBreakGlass
} from '../../services/admin.service';
import './AdminPages.css';

/**
 * Break-Glass Management Page
 * Admin oversight for emergency access
 */

const BreakGlassManagement = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            let response;
            switch (activeTab) {
                case 'pending':
                    response = await getBreakGlassPending();
                    break;
                case 'active':
                    response = await getBreakGlassActive();
                    break;
                case 'review':
                    response = await getBreakGlassPendingReview();
                    break;
                default:
                    response = { data: [] };
            }
            setData(response.data || []);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (logId) => {
        try {
            await approveBreakGlass(logId, 'Approved by admin');
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to approve');
        }
    };

    const handleReject = async (logId) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        try {
            await rejectBreakGlass(logId, reason);
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to reject');
        }
    };

    const handleRevoke = async (logId) => {
        const reason = prompt('Enter revocation reason:');
        if (!reason) return;
        try {
            await revokeBreakGlass(logId, reason);
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to revoke');
        }
    };

    const handleReview = async (logId, outcome) => {
        try {
            await reviewBreakGlass(logId, outcome, 'Reviewed by admin');
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to review');
        }
    };

    const getTimeRemaining = (expiresAt) => {
        const diff = new Date(expiresAt) - new Date();
        if (diff <= 0) return 'Expired';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>🔓 Break-Glass Access Management</h1>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    ⏳ Pending Approval
                </button>
                <button
                    className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    🟢 Active Sessions
                </button>
                <button
                    className={`tab ${activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('review')}
                >
                    📋 Pending Review
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Log Code</th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Emergency Type</th>
                            <th>Access Level</th>
                            <th>{activeTab === 'active' ? 'Time Remaining' : 'Requested At'}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="loading-cell">Loading...</td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="empty-cell">
                                    No {activeTab} break-glass requests
                                </td>
                            </tr>
                        ) : (
                            data.map((log) => (
                                <tr key={log._id}>
                                    <td className="code-cell">{log.logCode}</td>
                                    <td>
                                        {log.requestedBy?.profile?.firstName} {log.requestedBy?.profile?.lastName}
                                        <br />
                                        <small>{log.requestedBy?.username}</small>
                                    </td>
                                    <td>
                                        <span className="badge badge-blue">
                                            {log.requestedBy?.role}
                                        </span>
                                    </td>
                                    <td>{log.emergencyType?.replace(/_/g, ' ')}</td>
                                    <td>
                                        <span className={`badge ${log.accessLevel === 'emergency' ? 'badge-red' :
                                                log.accessLevel === 'full_clinical' ? 'badge-yellow' :
                                                    'badge-green'
                                            }`}>
                                            {log.accessLevel}
                                        </span>
                                    </td>
                                    <td>
                                        {activeTab === 'active'
                                            ? getTimeRemaining(log.expiresAt)
                                            : new Date(log.requestedAt).toLocaleString()
                                        }
                                    </td>
                                    <td className="actions-cell">
                                        {activeTab === 'pending' && (
                                            <>
                                                <button
                                                    className="btn-icon success"
                                                    title="Approve"
                                                    onClick={() => handleApprove(log._id)}
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    className="btn-icon danger"
                                                    title="Reject"
                                                    onClick={() => handleReject(log._id)}
                                                >
                                                    ✗
                                                </button>
                                            </>
                                        )}
                                        {activeTab === 'active' && (
                                            <button
                                                className="btn-icon danger"
                                                title="Revoke"
                                                onClick={() => handleRevoke(log._id)}
                                            >
                                                🚫
                                            </button>
                                        )}
                                        {activeTab === 'review' && (
                                            <>
                                                <button
                                                    className="btn-icon success"
                                                    title="Justified"
                                                    onClick={() => handleReview(log._id, 'justified')}
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    className="btn-icon warning"
                                                    title="Questionable"
                                                    onClick={() => handleReview(log._id, 'questionable')}
                                                >
                                                    ⚠️
                                                </button>
                                                <button
                                                    className="btn-icon danger"
                                                    title="Abuse"
                                                    onClick={() => handleReview(log._id, 'abuse')}
                                                >
                                                    🚨
                                                </button>
                                            </>
                                        )}
                                        <button className="btn-icon" title="View Details">
                                            👁️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-icon">⏳</span>
                    <div>
                        <span className="stat-label">Pending Approval</span>
                        <span className="stat-value">{activeTab === 'pending' ? data.length : '-'}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🟢</span>
                    <div>
                        <span className="stat-label">Active Sessions</span>
                        <span className="stat-value">{activeTab === 'active' ? data.length : '-'}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">📋</span>
                    <div>
                        <span className="stat-label">Pending Review</span>
                        <span className="stat-value">{activeTab === 'review' ? data.length : '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BreakGlassManagement;
