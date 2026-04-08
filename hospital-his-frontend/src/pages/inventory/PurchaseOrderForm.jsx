/**
 * Purchase Order Form Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './PurchaseOrderForm.css';

const PurchaseOrderForm = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);

    const [formData, setFormData] = useState({
        vendor: '',
        deliveryLocation: '',
        expectedDeliveryDate: '',
        remarks: '',
        items: [{ item: '', quantity: 1, unitPrice: 0 }]
    });

    useEffect(() => {
        fetchVendors();
        fetchItems();
        fetchLocations();
    }, []);

    const fetchVendors = async () => {
        try {
            const response = await inventoryManagerService.getVendors({ isActive: true });
            setVendors(response?.data || response || []);
        } catch (err) { console.error(err); }
    };

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
        newItems[index][field] = field === 'quantity' || field === 'unitPrice' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { item: '', quantity: 1, unitPrice: 0 }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.vendor) { setError('Please select a vendor'); return; }
        if (!formData.items[0].item) { setError('Please add at least one item'); return; }

        try {
            setSaving(true);
            const dataToSend = {
                vendor: formData.vendor,
                deliveryLocation: formData.deliveryLocation || undefined,
                expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
                notes: formData.remarks,
                items: formData.items.filter(i => i.item).map(i => ({
                    item: i.item,
                    quantity: i.quantity,
                    rate: i.unitPrice,
                    amount: i.quantity * i.unitPrice
                }))
            };
            await inventoryManagerService.createPurchaseOrder(dataToSend);
            alert('Purchase Order created successfully!');
            navigate('/inventory/purchase-orders');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create PO');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="po-form-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory/purchase-orders')}>← Back</button>
                    <div>
                        <h1>Create Purchase Order</h1>
                        <p>Create a new purchase order for vendor</p>
                    </div>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="po-form">
                <section className="form-section">
                    <h2>Order Details</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Vendor *</label>
                            <select name="vendor" value={formData.vendor} onChange={handleChange} required>
                                <option value="">Select Vendor</option>
                                {vendors.map(v => <option key={v._id} value={v._id}>{v.vendorName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Delivery Location</label>
                            <select name="deliveryLocation" value={formData.deliveryLocation} onChange={handleChange}>
                                <option value="">Select Location</option>
                                {locations.map(l => <option key={l._id} value={l._id}>{l.locationName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Expected Delivery Date</label>
                            <input type="date" name="expectedDeliveryDate" value={formData.expectedDeliveryDate} onChange={handleChange} />
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <div className="section-header">
                        <h2>Items</h2>
                        <button type="button" className="add-item-btn" onClick={addItem}>+ Add Item</button>
                    </div>
                    <table className="items-table">
                        <thead>
                            <tr><th>Item</th><th>Quantity</th><th>Unit Price</th><th>Total</th><th></th></tr>
                        </thead>
                        <tbody>
                            {formData.items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <select value={item.item} onChange={(e) => handleItemChange(index, 'item', e.target.value)}>
                                            <option value="">Select Item</option>
                                            {items.map(i => <option key={i._id} value={i._id}>{i.itemName}</option>)}
                                        </select>
                                    </td>
                                    <td><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} min="1" /></td>
                                    <td><input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} min="0" step="0.01" /></td>
                                    <td>₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                    <td><button type="button" className="remove-btn" onClick={() => removeItem(index)}>×</button></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr><td colSpan="3" className="total-label">Total:</td><td colSpan="2" className="total-value">₹{calculateTotal().toFixed(2)}</td></tr>
                        </tfoot>
                    </table>
                </section>

                <section className="form-section">
                    <div className="form-group full-width">
                        <label>Remarks</label>
                        <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" />
                    </div>
                </section>

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => navigate('/inventory/purchase-orders')}>Cancel</button>
                    <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Creating...' : 'Create PO'}</button>
                </div>
            </form>
        </div>
    );
};

export default PurchaseOrderForm;
