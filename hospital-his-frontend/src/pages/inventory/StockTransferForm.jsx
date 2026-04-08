/**
 * Stock Transfer Form - Transfer stock between locations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './StockTransferForm.css';

const StockTransferForm = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);

    const [formData, setFormData] = useState({
        fromLocation: '',
        toLocation: '',
        transferReason: '',
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
        if (!formData.fromLocation || !formData.toLocation) {
            setError('Please select both from and to locations'); return;
        }
        if (formData.fromLocation === formData.toLocation) {
            setError('From and To locations must be different'); return;
        }
        if (!formData.items[0]?.item) { setError('Please add at least one item'); return; }

        try {
            setSaving(true);
            const dataToSend = {
                sourceLocation: formData.fromLocation,
                destinationLocation: formData.toLocation,
                transferReason: formData.transferReason,
                notes: formData.remarks,
                items: formData.items.filter(i => i.item).map(i => ({
                    item: i.item,
                    quantity: i.quantity
                }))
            };
            await inventoryManagerService.createStockTransfer(dataToSend);
            alert('Stock Transfer request created successfully!');
            navigate('/inventory/stock-transfers');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create transfer');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="stock-transfer-form-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory/stock-transfers')}>← Back</button>
                    <div>
                        <h1>Transfer Stock</h1>
                        <p>Transfer inventory between locations</p>
                    </div>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="transfer-form">
                <section className="form-section">
                    <h2>Transfer Details</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>From Location *</label>
                            <select name="fromLocation" value={formData.fromLocation} onChange={handleChange} required>
                                <option value="">Select Source</option>
                                {locations.map(l => <option key={l._id} value={l._id}>{l.locationName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>To Location *</label>
                            <select name="toLocation" value={formData.toLocation} onChange={handleChange} required>
                                <option value="">Select Destination</option>
                                {locations.map(l => <option key={l._id} value={l._id}>{l.locationName}</option>)}
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label>Transfer Reason</label>
                            <input type="text" name="transferReason" value={formData.transferReason}
                                onChange={handleChange} placeholder="e.g., Stock replenishment, Emergency requirement" />
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <div className="section-header">
                        <h2>Items to Transfer</h2>
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
                    <button type="button" className="btn-cancel" onClick={() => navigate('/inventory/stock-transfers')}>Cancel</button>
                    <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Creating...' : 'Create Transfer'}</button>
                </div>
            </form>
        </div>
    );
};

export default StockTransferForm;
