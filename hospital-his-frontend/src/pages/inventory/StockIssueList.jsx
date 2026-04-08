/**
 * Stock Issues List Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './StockIssueList.css';

const StockIssueList = () => {
    const navigate = useNavigate();
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchIssues();
    }, [statusFilter]);

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const response = await inventoryManagerService.getStockIssues(params);
            setIssues(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch issues:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this stock issue request?')) return;
        try {
            await inventoryManagerService.approveStockIssue(id);
            fetchIssues();
        } catch (err) { alert('Failed to approve'); }
    };

    const handleProcess = async (id) => {
        if (!window.confirm('Process and issue the stock?')) return;
        try {
            await inventoryManagerService.processStockIssue(id);
            fetchIssues();
        } catch (err) { alert('Failed to process'); }
    };

    return (
        <div className="stock-issue-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory')}>← Back</button>
                    <div>
                        <h1>Stock Issues</h1>
                        <p>Manage stock issue requests to departments</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => navigate('/inventory/stock-issues/new')}>
                    + Create Issue Request
                </button>
            </header>

            <div className="filters-bar">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="issued">Issued</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Issue Number</th>
                                <th>Requesting Dept</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {issues.length === 0 ? (
                                <tr><td colSpan="6" className="no-data">No stock issues found</td></tr>
                            ) : issues.map(issue => (
                                <tr key={issue._id}>
                                    <td className="code">{issue.issueNumber}</td>
                                    <td>{issue.requestingDepartment?.name || issue.requestingLocation?.locationName || '-'}</td>
                                    <td>{new Date(issue.requestDate || issue.createdAt).toLocaleDateString()}</td>
                                    <td>{issue.items?.length || 0} items</td>
                                    <td><span className={`status-badge ${issue.status}`}>{issue.status}</span></td>
                                    <td className="actions">
                                        {issue.status === 'pending' && (
                                            <button className="action-btn approve" onClick={() => handleApprove(issue._id)}>✅</button>
                                        )}
                                        {issue.status === 'approved' && (
                                            <button className="action-btn process" onClick={() => handleProcess(issue._id)}>📤</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockIssueList;
