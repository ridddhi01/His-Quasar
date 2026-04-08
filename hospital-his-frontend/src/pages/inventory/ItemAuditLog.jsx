/**
 * Item Audit Log - View change history for an item
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './ItemAuditLog.css';

const ItemAuditLog = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [auditLog, setAuditLog] = useState([]);
    const [item, setItem] = useState(null);

    useEffect(() => {
        fetchAuditLog();
    }, [id]);

    const fetchAuditLog = async () => {
        try {
            setLoading(true);
            // Get item details
            const itemRes = await inventoryManagerService.getItem(id);
            setItem(itemRes?.data || itemRes);

            // Get audit log
            const logRes = await inventoryManagerService.getItemAuditLog(id);
            setAuditLog(logRes?.data || logRes || []);
        } catch (err) {
            console.error('Failed to fetch audit log:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="audit-log-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory/items')}>← Back</button>
                    <div>
                        <h1>Audit Log</h1>
                        <p>Change history for {item?.itemName || 'Item'}</p>
                    </div>
                </div>
            </header>

            {item && (
                <div className="item-info">
                    <span className="item-code">{item.itemCode}</span>
                    <span className="item-name">{item.itemName}</span>
                    <span className="item-category">{item.category?.categoryName}</span>
                </div>
            )}

            {loading ? (
                <div className="loading">Loading audit log...</div>
            ) : auditLog.length === 0 ? (
                <div className="no-data">
                    <p>No audit history available for this item.</p>
                    <p className="hint">Changes to item details will be recorded here.</p>
                </div>
            ) : (
                <div className="timeline">
                    {auditLog.map((entry, idx) => (
                        <div key={idx} className="timeline-item">
                            <div className="timeline-marker"></div>
                            <div className="timeline-content">
                                <div className="timeline-header">
                                    <span className="action">{entry.action || entry.field}</span>
                                    <span className="time">{formatDate(entry.changedAt || entry.timestamp)}</span>
                                </div>
                                <div className="timeline-body">
                                    {entry.field && (
                                        <p><strong>{entry.field}:</strong> {entry.oldValue} → {entry.newValue}</p>
                                    )}
                                    {entry.description && <p>{entry.description}</p>}
                                    <p className="user">by {entry.changedBy?.profile?.firstName || entry.user?.profile?.firstName || 'System'}</p>
                                    {entry.reason && <p className="reason">Reason: {entry.reason}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ItemAuditLog;
