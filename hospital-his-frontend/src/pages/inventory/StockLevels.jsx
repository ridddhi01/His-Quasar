/**
 * Stock Levels Page - View current stock with alerts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryManagerService from '../../services/inventoryManager.service';
import './StockLevels.css';

const StockLevels = () => {
    const navigate = useNavigate();
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('all'); // all, low, near-expiry, expired

    useEffect(() => {
        fetchStockData();
    }, [view]);

    const fetchStockData = async () => {
        try {
            setLoading(true);
            let response;
            switch (view) {
                case 'low':
                    response = await inventoryManagerService.getLowStockItems();
                    break;
                case 'near-expiry':
                    response = await inventoryManagerService.getNearExpiryItems(30);
                    break;
                case 'expired':
                    response = await inventoryManagerService.getExpiredItems();
                    break;
                default:
                    response = await inventoryManagerService.getStockLevels({});
            }
            setStockData(response?.data || response || []);
        } catch (err) {
            console.error('Failed to fetch stock data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStockStatus = (item) => {
        if (item.quantity <= 0) return { class: 'red', text: 'Out of Stock' };
        if (item.quantity <= (item.reorderLevel || 10)) return { class: 'orange', text: 'Low Stock' };
        return { class: 'green', text: 'In Stock' };
    };

    return (
        <div className="stock-levels-page">
            <header className="page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/inventory')}>← Back</button>
                    <div>
                        <h1>Stock Levels</h1>
                        <p>Monitor inventory stock across locations</p>
                    </div>
                </div>
            </header>

            <div className="view-tabs">
                <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All Stock</button>
                <button className={view === 'low' ? 'active' : ''} onClick={() => setView('low')}>⚠️ Low Stock</button>
                <button className={view === 'near-expiry' ? 'active' : ''} onClick={() => setView('near-expiry')}>⏰ Near Expiry</button>
                <button className={view === 'expired' ? 'active' : ''} onClick={() => setView('expired')}>❌ Expired</button>
            </div>

            {loading ? (
                <div className="loading">Loading stock data...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Item Name</th>
                                <th>Location</th>
                                <th>Quantity</th>
                                <th>Batch</th>
                                <th>Expiry Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockData.length === 0 ? (
                                <tr><td colSpan="7" className="no-data">No stock data found for this view</td></tr>
                            ) : stockData.map((stock, idx) => {
                                const status = getStockStatus(stock);
                                return (
                                    <tr key={stock._id || idx}>
                                        <td className="code">{stock.item?.itemCode || stock.itemCode || '-'}</td>
                                        <td>{stock.item?.itemName || stock.itemName || '-'}</td>
                                        <td>{stock.location?.locationName || '-'}</td>
                                        <td className={status.class}>{stock.quantity || 0} {stock.item?.uom || ''}</td>
                                        <td>{stock.batchNumber || '-'}</td>
                                        <td>{stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString() : '-'}</td>
                                        <td><span className={`status-badge ${status.class}`}>{status.text}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StockLevels;
