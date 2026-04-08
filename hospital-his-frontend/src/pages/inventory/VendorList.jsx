/**
 * Vendor List Page
 * Lists all vendors with search, filter and actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './VendorList.css';

const VendorList = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');

    useEffect(() => {
        fetchVendors();
    }, [statusFilter]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const params = { isActive: statusFilter === 'active' };
            if (searchTerm) params.search = searchTerm;
            const response = await inventoryManagerService.getVendors(params);
            setVendors(response?.data || response || []);
            setError(null);
        } catch (err) {
            setError('Failed to load vendors');
            console.error('Vendors error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchVendors();
    };

    return (
        <div className="vendor-list-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory')}>
                        ← Back
                    </button>
                    <div>
                        <h1>Vendor Management</h1>
                        <p>Manage suppliers and vendors</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => navigate('/inventory/vendors/new')}>
                    + Add Vendor
                </button>
            </header>

            <div className="filters-bar">
                <form onSubmit={handleSearch} className="search-form">
                    <input
                        type="text"
                        placeholder="Search by vendor name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit">Search</button>
                </form>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="active">Active Vendors</option>
                    <option value="all">All Vendors</option>
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading vendors...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Vendor Code</th>
                                <th>Vendor Name</th>
                                <th>Contact Person</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vendors.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="no-data">
                                        No vendors found. Click "Add Vendor" to create one.
                                    </td>
                                </tr>
                            ) : (
                                vendors.map(vendor => (
                                    <tr key={vendor._id}>
                                        <td className="code">{vendor.vendorCode}</td>
                                        <td>{vendor.vendorName}</td>
                                        <td>{vendor.contactPerson || '-'}</td>
                                        <td>{vendor.phone || '-'}</td>
                                        <td>{vendor.email || '-'}</td>
                                        <td>
                                            <span className={`status-badge ${vendor.isActive ? 'active' : 'inactive'}`}>
                                                {vendor.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions">
                                            <button
                                                className="action-btn view"
                                                onClick={() => navigate(`/inventory/vendors/${vendor._id}`)}
                                                title="View"
                                            >👁</button>
                                            <button
                                                className="action-btn edit"
                                                onClick={() => navigate(`/inventory/vendors/${vendor._id}/edit`)}
                                                title="Edit"
                                            >✏️</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default VendorList;
