/**
 * Stock Transfers List Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './StockTransferList.css';

const StockTransferList = () => {
    const navigate = useNavigate();
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const response = await inventoryManagerService.getStockTransfers({});
            setTransfers(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch transfers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this transfer?')) return;
        try {
            await inventoryManagerService.approveStockTransfer(id);
            fetchTransfers();
        } catch (err) { alert('Failed to approve'); }
    };

    const handleDispatch = async (id) => {
        if (!window.confirm('Dispatch this transfer?')) return;
        try {
            await inventoryManagerService.dispatchStockTransfer(id);
            fetchTransfers();
        } catch (err) { alert('Failed to dispatch'); }
    };

    return (
        <div className="transfer-list-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory')}>← Back</button>
                    <div>
                        <h1>Stock Transfers</h1>
                        <p>Transfer stock between locations</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => navigate('/inventory/stock-transfers/new')}>
                    + Create Transfer
                </button>
            </header>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Transfer #</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.length === 0 ? (
                                <tr><td colSpan="7" className="no-data">No transfers found</td></tr>
                            ) : transfers.map(t => (
                                <tr key={t._id}>
                                    <td className="code">{t.transferNumber}</td>
                                    <td>{t.fromLocation?.locationName || '-'}</td>
                                    <td>{t.toLocation?.locationName || '-'}</td>
                                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                    <td>{t.items?.length || 0} items</td>
                                    <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                                    <td className="actions">
                                        {t.status === 'pending' && (
                                            <button className="action-btn approve" onClick={() => handleApprove(t._id)}>✅</button>
                                        )}
                                        {t.status === 'approved' && (
                                            <button className="action-btn dispatch" onClick={() => handleDispatch(t._id)}>🚚</button>
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

export default StockTransferList;
