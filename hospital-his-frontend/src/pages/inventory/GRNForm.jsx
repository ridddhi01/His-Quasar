/**
 * GRN Form - Goods Receipt Note Creation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './GRNForm.css';

const GRNForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const poId = searchParams.get('po');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [locations, setLocations] = useState([]);

    const [formData, setFormData] = useState({
        purchaseOrder: poId || '',
        receivedDate: new Date().toISOString().split('T')[0],
        receivedLocation: '',
        invoiceNumber: '',
        invoiceDate: '',
        remarks: '',
        items: []
    });

    useEffect(() => {
        fetchPurchaseOrders();
        fetchLocations();
    }, []);

    useEffect(() => {
        if (formData.purchaseOrder) {
            fetchPODetails(formData.purchaseOrder);
        }
    }, [formData.purchaseOrder]);

    const fetchPurchaseOrders = async () => {
        try {
            const response = await inventoryManagerService.getPurchaseOrders({ status: 'approved' });
            setPurchaseOrders(response?.data || response || []);
        } catch (err) { console.error(err); }
    };

    const fetchLocations = async () => {
        try {
            const response = await inventoryManagerService.getLocations();
            setLocations(response?.data || response || []);
        } catch (err) { console.error(err); }
    };

    const fetchPODetails = async (id) => {
        try {
            const response = await inventoryManagerService.getPurchaseOrder(id);
            const po = response?.data || response;
            setSelectedPO(po);
            if (po?.items) {
                setFormData(prev => ({
                    ...prev,
                    items: po.items.map(item => ({
                        item: item.item?._id || item.item,
                        itemName: item.item?.itemName || 'Item',
                        orderedQuantity: item.orderedQuantity,
                        receivedQuantity: item.orderedQuantity - (item.receivedQuantity || 0),
                        batchNumber: '',
                        expiryDate: '',
                        condition: 'good'
                    }))
                }));
            }
        } catch (err) { console.error(err); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.purchaseOrder) { setError('Please select a Purchase Order'); return; }

        try {
            setSaving(true);
            const dataToSend = {
                purchaseOrder: formData.purchaseOrder,
                receivedDate: formData.receivedDate,
                receivedLocation: formData.receivedLocation || undefined,
                invoiceNumber: formData.invoiceNumber,
                invoiceDate: formData.invoiceDate || undefined,
                remarks: formData.remarks,
                items: formData.items.filter(i => i.receivedQuantity > 0).map(i => ({
                    item: i.item,
                    receivedQuantity: parseInt(i.receivedQuantity) || 0,
                    batchNumber: i.batchNumber || undefined,
                    expiryDate: i.expiryDate || undefined,
                    condition: i.condition
                }))
            };
            await inventoryManagerService.createGRN(dataToSend);
            alert('GRN created successfully! Stock has been updated.');
            navigate('/inventory/grns');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create GRN');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grn-form-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory/grns')}>← Back</button>
                    <div>
                        <h1>Receive Goods (GRN)</h1>
                        <p>Record goods received from purchase order</p>
                    </div>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="grn-form">
                <section className="form-section">
                    <h2>Receipt Details</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Purchase Order *</label>
                            <select name="purchaseOrder" value={formData.purchaseOrder} onChange={handleChange} required>
                                <option value="">Select PO</option>
                                {purchaseOrders.map(po => (
                                    <option key={po._id} value={po._id}>
                                        {po.poNumber} - {po.vendor?.vendorName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Received Date *</label>
                            <input type="date" name="receivedDate" value={formData.receivedDate} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Receiving Location</label>
                            <select name="receivedLocation" value={formData.receivedLocation} onChange={handleChange}>
                                <option value="">Select Location</option>
                                {locations.map(l => <option key={l._id} value={l._id}>{l.locationName}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Invoice Number</label>
                            <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Invoice Date</label>
                            <input type="date" name="invoiceDate" value={formData.invoiceDate} onChange={handleChange} />
                        </div>
                    </div>
                </section>

                {formData.items.length > 0 && (
                    <section className="form-section">
                        <h2>Items to Receive</h2>
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Ordered</th>
                                    <th>Receiving</th>
                                    <th>Batch #</th>
                                    <th>Expiry</th>
                                    <th>Condition</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.itemName}</td>
                                        <td>{item.orderedQuantity}</td>
                                        <td>
                                            <input type="number" value={item.receivedQuantity}
                                                onChange={(e) => handleItemChange(idx, 'receivedQuantity', e.target.value)}
                                                min="0" max={item.orderedQuantity} />
                                        </td>
                                        <td>
                                            <input type="text" value={item.batchNumber}
                                                onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                                                placeholder="Batch" />
                                        </td>
                                        <td>
                                            <input type="date" value={item.expiryDate}
                                                onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)} />
                                        </td>
                                        <td>
                                            <select value={item.condition}
                                                onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}>
                                                <option value="good">Good</option>
                                                <option value="damaged">Damaged</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                <section className="form-section">
                    <div className="form-group full-width">
                        <label>Remarks</label>
                        <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" />
                    </div>
                </section>

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => navigate('/inventory/grns')}>Cancel</button>
                    <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Creating...' : 'Create GRN'}</button>
                </div>
            </form>
        </div>
    );
};

export default GRNForm;
