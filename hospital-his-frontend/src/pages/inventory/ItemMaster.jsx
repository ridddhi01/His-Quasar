/**
 * Item Master Page
 * CRUD operations for inventory items
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './ItemMaster.css';

const ItemMaster = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0
    });

    useEffect(() => {
        fetchCategories();
        fetchItems();
    }, [pagination.page, selectedCategory, searchTerm]);

    const fetchCategories = async () => {
        try {
            const response = await inventoryManagerService.getCategories();
            setCategories(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                isActive: true
            };
            if (searchTerm) params.search = searchTerm;
            if (selectedCategory) params.category = selectedCategory;

            const response = await inventoryManagerService.getItems(params);
            // Service returns { success, data, pagination }
            setItems(response?.data || response || []);
            setPagination(prev => ({ ...prev, total: response?.pagination?.total || 0 }));
            setError(null);
        } catch (err) {
            setError('Failed to load items');
            console.error('Items error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleCategoryFilter = (e) => {
        setSelectedCategory(e.target.value);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleDeactivate = async (id, itemName) => {
        if (!window.confirm(`Are you sure you want to deactivate "${itemName}"?`)) return;

        const reason = prompt('Please provide a reason for deactivation:');
        if (!reason) return;

        try {
            await inventoryManagerService.deactivateItem(id, reason);
            fetchItems();
        } catch (err) {
            alert('Failed to deactivate item');
            console.error('Deactivate error:', err);
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="item-master">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory')}>
                        ← Back
                    </button>
                    <div>
                        <h1>Item Master</h1>
                        <p>Manage non-medicine inventory items</p>
                    </div>
                </div>
                <button className="add-btn" onClick={() => navigate('/inventory/items/new')}>
                    + Add New Item
                </button>
            </header>

            {/* Filters */}
            <div className="filters-bar">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search by item code or name..."
                    value={searchTerm}
                    onChange={handleSearch}
                />
                <select
                    className="category-select"
                    value={selectedCategory}
                    onChange={handleCategoryFilter}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>
                            {cat.categoryName}
                        </option>
                    ))}
                </select>
                <span className="results-count">
                    {pagination.total} items found
                </span>
            </div>

            {/* Items Table */}
            {loading ? (
                <div className="loading">Loading items...</div>
            ) : error ? (
                <div className="error">{error}</div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th>Category</th>
                                    <th>UOM</th>
                                    <th>Reorder Level</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="no-data">
                                            No items found
                                        </td>
                                    </tr>
                                ) : (
                                    items.map(item => (
                                        <tr key={item._id}>
                                            <td className="code">{item.itemCode}</td>
                                            <td>{item.itemName}</td>
                                            <td>{item.category?.categoryName || '-'}</td>
                                            <td>{item.uom}</td>
                                            <td>{item.reorderLevel}</td>
                                            <td>
                                                <span className={`status-badge ${item.status}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="actions">
                                                <button
                                                    className="action-btn view"
                                                    onClick={() => navigate(`/inventory/items/${item._id}`)}
                                                    title="View Details"
                                                >
                                                    👁
                                                </button>
                                                <button
                                                    className="action-btn edit"
                                                    onClick={() => navigate(`/inventory/items/${item._id}/edit`)}
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="action-btn history"
                                                    onClick={() => navigate(`/inventory/items/${item._id}/audit`)}
                                                    title="View History"
                                                >
                                                    📜
                                                </button>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDeactivate(item._id, item.itemName)}
                                                    title="Deactivate"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </button>
                            <span>
                                Page {pagination.page} of {totalPages}
                            </span>
                            <button
                                disabled={pagination.page === totalPages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ItemMaster;
