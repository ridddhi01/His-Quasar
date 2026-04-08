/**
 * GRN (Goods Receipt Note) List Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './GRNList.css';

const GRNList = () => {
    const navigate = useNavigate();
    const [grns, setGrns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGRNs();
    }, []);

    const fetchGRNs = async () => {
        try {
            setLoading(true);
            const response = await inventoryManagerService.getGRNs({});
            setGrns(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch GRNs:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grn-list-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory')}>← Back</button>
                    <div>
                        <h1>Goods Receipt Notes</h1>
                        <p>Record received goods from purchase orders</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => navigate('/inventory/grns/new')}>
                    + Create GRN
                </button>
            </header>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>GRN Number</th>
                                <th>PO Number</th>
                                <th>Vendor</th>
                                <th>Received Date</th>
                                <th>Items</th>
                                <th>Stock Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grns.length === 0 ? (
                                <tr><td colSpan="6" className="no-data">No GRNs found</td></tr>
                            ) : grns.map(grn => (
                                <tr key={grn._id}>
                                    <td className="code">{grn.grnNumber}</td>
                                    <td>{grn.purchaseOrder?.poNumber || '-'}</td>
                                    <td>{grn.vendor?.vendorName || grn.purchaseOrder?.vendor?.vendorName || '-'}</td>
                                    <td>{new Date(grn.receivedDate).toLocaleDateString()}</td>
                                    <td>{grn.items?.length || 0} items</td>
                                    <td>
                                        <span className={`status-badge ${grn.stockUpdated ? 'green' : 'orange'}`}>
                                            {grn.stockUpdated ? 'Yes' : 'Pending'}
                                        </span>
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

export default GRNList;
