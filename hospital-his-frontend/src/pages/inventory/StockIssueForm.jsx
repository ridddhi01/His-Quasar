/**
 * Stock Issue Form - Issue stock to departments
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './StockIssueForm.css';

const StockIssueForm = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);

    const [formData, setFormData] = useState({
        requestingLocation: '',
        issueType: 'department_request',
        priority: 'normal',
        requiredDate: '',
        remarks: '',
        items: [{ item: '', quantity: 1 }]
    });

    useEffect(() => {
        fetchItems();
        fetchLocations();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await inventoryManagerService.getItems({ isActive: true });
            setItems(response?.data || response || []);
        } catch (err) { console.error(err); }
    };

    const fetchLocations = async () => {
        try {
            const response = await inventoryManagerService.getLocations();
            setLocations(response?.data || response || []);
        } catch (err) { console.error(err); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = field === 'quantity' ? parseInt(value) || 0 : value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({ ...prev, items: [...prev.items, { item: '', quantity: 1 }] }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.requestingLocation) { setError('Please select requesting location'); return; }
        if (!formData.items[0]?.item) { setError('Please add at least one item'); return; }

        try {
            setSaving(true);
            const dataToSend = {
                requestingLocation: formData.requestingLocation,
                issueType: formData.issueType,
                priority: formData.priority,
                requiredDate: formData.requiredDate || undefined,
                remarks: formData.remarks,
                items: formData.items.filter(i => i.item).map(i => ({
                    item: i.item,
                    requestedQuantity: i.quantity
                }))
            };
            await inventoryManagerService.createStockIssue(dataToSend);
            alert('Stock Issue request created successfully!');
            navigate('/inventory/stock-issues');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create stock issue');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="stock-issue-form-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory/stock-issues')}>← Back</button>
                    <div>
                        <h1>Issue Stock</h1>
                        <p>Create stock issue request for department</p>
                    </div>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="issue-form">
                <section className="form-section">
                    <h2>Issue Details</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Requesting Location *</label>
                            <select name="requestingLocation" value={formData.requestingLocation} onChange={handleChange} required>
                                <option value="">Select Location</option>
                                {locations.map(l => <option key={l._id} value={l._id}>{l.locationName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Issue Type</label>
                            <select name="issueType" value={formData.issueType} onChange={handleChange}>
                                <option value="department_request">Department Request</option>
                                <option value="emergency">Emergency</option>
                                <option value="replenishment">Replenishment</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Priority</label>
                            <select name="priority" value={formData.priority} onChange={handleChange}>
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Required Date</label>
                            <input type="date" name="requiredDate" value={formData.requiredDate} onChange={handleChange} />
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <div className="section-header">
                        <h2>Items to Issue</h2>
                        <button type="button" className="add-item-btn" onClick={addItem}>+ Add Item</button>
                    </div>
                    <table className="items-table">
                        <thead>
                            <tr><th>Item</th><th>Quantity</th><th></th></tr>
                        </thead>
                        <tbody>
                            {formData.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <select value={item.item} onChange={(e) => handleItemChange(idx, 'item', e.target.value)}>
                                            <option value="">Select Item</option>
                                            {items.map(i => <option key={i._id} value={i._id}>{i.itemName}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input type="number" value={item.quantity}
                                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} min="1" />
                                    </td>
                                    <td>
                                        <button type="button" className="remove-btn" onClick={() => removeItem(idx)}>×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section className="form-section">
                    <div className="form-group full-width">
                        <label>Remarks</label>
                        <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" />
                    </div>
                </section>

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => navigate('/inventory/stock-issues')}>Cancel</button>
                    <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Creating...' : 'Create Issue Request'}</button>
                </div>
            </form>
        </div>
    );
};

export default StockIssueForm;
