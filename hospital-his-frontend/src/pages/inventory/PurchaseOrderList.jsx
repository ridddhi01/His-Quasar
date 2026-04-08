/**
 * Purchase Orders List Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './PurchaseOrderList.css';

const PurchaseOrderList = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const response = await inventoryManagerService.getPurchaseOrders(params);
            setOrders(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch POs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this Purchase Order?')) return;
        try {
            await inventoryManagerService.approvePurchaseOrder(id);
            fetchOrders();
        } catch (err) {
            alert('Failed to approve PO');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: 'gray', pending_approval: 'orange', approved: 'blue',
            partially_received: 'purple', received: 'green', cancelled: 'red'
        };
        return colors[status] || 'gray';
    };

    return (
        <div className="po-list-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory')}>← Back</button>
                    <div>
                        <h1>Purchase Orders</h1>
                        <p>Manage purchase orders to vendors</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => navigate('/inventory/purchase-orders/new')}>
                    + Create PO
                </button>
            </header>

            <div className="filters-bar">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="partially_received">Partially Received</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>Vendor</th>
                                <th>Date</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr><td colSpan="6" className="no-data">No purchase orders found</td></tr>
                            ) : orders.map(po => (
                                <tr key={po._id}>
                                    <td className="code">{po.poNumber}</td>
                                    <td>{po.vendor?.vendorName || '-'}</td>
                                    <td>{new Date(po.poDate).toLocaleDateString()}</td>
                                    <td>₹{(po.totalAmount || 0).toLocaleString()}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusColor(po.status)}`}>
                                            {po.status?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button className="action-btn view" onClick={() => navigate(`/inventory/purchase-orders/${po._id}`)}>👁</button>
                                        {(po.status === 'pending_approval' || po.status === 'draft') && (
                                            <button className="action-btn approve" onClick={() => handleApprove(po._id)} title="Approve">✅</button>
                                        )}
                                        {po.status === 'approved' && (
                                            <button className="action-btn grn" onClick={() => navigate(`/inventory/grns/new?po=${po._id}`)} title="Receive Goods">📥</button>
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

export default PurchaseOrderList;
