/**
 * Item Form Component
 * Form for creating/editing inventory items
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './ItemForm.css';

const ItemForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id && id !== 'new';

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);

    const [formData, setFormData] = useState({
        itemCode: '',
        itemName: '',
        description: '',
        category: '',
        subCategory: '',
        uom: 'Piece',
        reorderLevel: 10,
        maxStockLevel: 100,
        batchTracking: false,
        expiryTracking: false,
        defaultLocation: '',
        specifications: '',
    });

    const uomOptions = [
        'Piece', 'Box', 'Pack', 'Carton', 'Kg', 'Gram', 'Liter', 'ML',
        'Meter', 'Roll', 'Sheet', 'Set', 'Pair', 'Dozen', 'Unit'
    ];

    useEffect(() => {
        fetchCategories();
        fetchLocations();
        if (isEditMode) {
            fetchItem();
        }
    }, [id]);

    const fetchCategories = async () => {
        try {
            const response = await inventoryManagerService.getCategories();
            setCategories(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await inventoryManagerService.getLocations();
            setLocations(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch locations:', err);
        }
    };

    const fetchItem = async () => {
        try {
            setLoading(true);
            const response = await inventoryManagerService.getItem(id);
            const item = response?.data || response;
            if (item) {
                setFormData({
                    itemCode: item.itemCode || '',
                    itemName: item.itemName || '',
                    description: item.description || '',
                    category: item.category?._id || item.category || '',
                    subCategory: item.subCategory?._id || item.subCategory || '',
                    uom: item.uom || 'Piece',
                    reorderLevel: item.reorderLevel || 10,
                    maxStockLevel: item.maxStockLevel || 100,
                    batchTracking: item.batchTracking || false,
                    expiryTracking: item.expiryTracking || false,
                    defaultLocation: item.defaultLocation?._id || item.defaultLocation || '',
                    specifications: item.specifications || '',
                });
            }
        } catch (err) {
            setError('Failed to load item');
            console.error('Fetch item error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.itemCode.trim()) {
            setError('Item Code is required');
            return;
        }
        if (!formData.itemName.trim()) {
            setError('Item Name is required');
            return;
        }
        if (!formData.category) {
            setError('Category is required');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const dataToSend = {
                ...formData,
                reorderLevel: parseInt(formData.reorderLevel) || 0,
                maxStockLevel: parseInt(formData.maxStockLevel) || 0,
            };

            // Remove empty optional fields
            if (!dataToSend.subCategory) delete dataToSend.subCategory;
            if (!dataToSend.defaultLocation) delete dataToSend.defaultLocation;
            // Don't send specifications as string - it's a Map type in backend
            delete dataToSend.specifications;

            if (isEditMode) {
                await inventoryManagerService.updateItem(id, dataToSend);
                alert('Item updated successfully!');
            } else {
                await inventoryManagerService.createItem(dataToSend);
                alert('Item created successfully!');
            }

            navigate('/inventory/items');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to save item';
            setError(errorMsg);
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="loading-container">Loading item...</div>;
    }

    return (
        <div className="item-form-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory/items')}>
                        ← Back
                    </button>
                    <div>
                        <h1>{isEditMode ? 'Edit Item' : 'Add New Item'}</h1>
                        <p>{isEditMode ? 'Update inventory item details' : 'Create a new inventory item'}</p>
                    </div>
                </div>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="item-form">
                <section className="form-section">
                    <h2>Basic Information</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="itemCode">Item Code *</label>
                            <input
                                type="text"
                                id="itemCode"
                                name="itemCode"
                                value={formData.itemCode}
                                onChange={handleChange}
                                placeholder="e.g., INV-001"
                                required
                                disabled={isEditMode}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="itemName">Item Name *</label>
                            <input
                                type="text"
                                id="itemName"
                                name="itemName"
                                value={formData.itemName}
                                onChange={handleChange}
                                placeholder="Enter item name"
                                required
                            />
                        </div>
                        <div className="form-group full-width">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Enter item description"
                                rows="3"
                            />
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h2>Classification</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="category">Category *</label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat._id}>
                                        {cat.categoryName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="uom">Unit of Measure *</label>
                            <select
                                id="uom"
                                name="uom"
                                value={formData.uom}
                                onChange={handleChange}
                                required
                            >
                                {uomOptions.map(uom => (
                                    <option key={uom} value={uom}>{uom}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="defaultLocation">Default Location</label>
                            <select
                                id="defaultLocation"
                                name="defaultLocation"
                                value={formData.defaultLocation}
                                onChange={handleChange}
                            >
                                <option value="">Select Location</option>
                                {locations.map(loc => (
                                    <option key={loc._id} value={loc._id}>
                                        {loc.locationName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h2>Stock Settings</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="reorderLevel">Reorder Level</label>
                            <input
                                type="number"
                                id="reorderLevel"
                                name="reorderLevel"
                                value={formData.reorderLevel}
                                onChange={handleChange}
                                min="0"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="maxStockLevel">Max Stock Level</label>
                            <input
                                type="number"
                                id="maxStockLevel"
                                name="maxStockLevel"
                                value={formData.maxStockLevel}
                                onChange={handleChange}
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="form-checkboxes">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="batchTracking"
                                checked={formData.batchTracking}
                                onChange={handleChange}
                            />
                            <span>Enable Batch Tracking</span>
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="expiryTracking"
                                checked={formData.expiryTracking}
                                onChange={handleChange}
                            />
                            <span>Enable Expiry Tracking</span>
                        </label>
                    </div>
                </section>

                <section className="form-section">
                    <h2>Additional Information</h2>
                    <div className="form-group full-width">
                        <label htmlFor="specifications">Specifications</label>
                        <textarea
                            id="specifications"
                            name="specifications"
                            value={formData.specifications}
                            onChange={handleChange}
                            placeholder="Enter technical specifications or notes"
                            rows="4"
                        />
                    </div>
                </section>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate('/inventory/items')}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-save"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : (isEditMode ? 'Update Item' : 'Create Item')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ItemForm;
