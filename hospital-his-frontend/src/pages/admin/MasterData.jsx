import React, { useState, useEffect } from 'react';
import { adminService } from '../../services';
import {
    Database, Layers, Bed,
    CreditCard, Settings
} from 'lucide-react';
import './AdminPages.css';

const MasterData = () => {
    const [activeTab, setActiveTab] = useState('departments');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let response;
            switch (activeTab) {
                case 'departments':
                    response = await adminService.getDepartments();
                    break;
                case 'wards':
                    response = await adminService.getWards();
                    break;
                case 'tariffs':
                    response = await adminService.getTariffs();
                    break;
                default:
                    response = { data: [] };
            }
            setData(response.data || []);
        } catch (error) {
            console.error('Failed to fetch master data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderTable = () => {
        if (loading) return <div className="p-12 text-center text-gray-500">Loading data...</div>;
        if (data.length === 0) return <div className="p-12 text-center text-gray-500">No records found.</div>;

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            {activeTab === 'departments' && (
                                <>
                                    <th className="px-6 py-4 text-gray-600">Name</th>
                                    <th className="px-6 py-4 text-gray-600">Code</th>
                                    <th className="px-6 py-4 text-gray-600">Head</th>
                                    <th className="px-6 py-4 text-gray-600">Status</th>
                                </>
                            )}
                            {activeTab === 'wards' && (
                                <>
                                    <th className="px-6 py-4 text-gray-600">Ward Name</th>
                                    <th className="px-6 py-4 text-gray-600">Type</th>
                                    <th className="px-6 py-4 text-gray-600">Capacity</th>
                                    <th className="px-6 py-4 text-gray-600">Floor</th>
                                </>
                            )}
                            {activeTab === 'tariffs' && (
                                <>
                                    <th className="px-6 py-4 text-gray-600">Service Name</th>
                                    <th className="px-6 py-4 text-gray-600">Code</th>
                                    <th className="px-6 py-4 text-gray-600">Base Price</th>
                                    <th className="px-6 py-4 text-gray-600">Category</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((item, idx) => (
                            <tr key={item._id || idx} className="hover:bg-slate-50/50">
                                {activeTab === 'departments' && (
                                    <>
                                        <td className="px-6 py-4 font-medium text-secondary-dark">{item.name}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{item.code}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.head?.profile?.lastName || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'wards' && (
                                    <>
                                        <td className="px-6 py-4 font-medium text-secondary-dark">{item.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.type}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.capacity} Beds</td>
                                        <td className="px-6 py-4 text-gray-600">{item.floor}</td>
                                    </>
                                )}
                                {activeTab === 'tariffs' && (
                                    <>
                                        <td className="px-6 py-4 font-medium text-secondary-dark">{item.name}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.code}</td>
                                        <td className="px-6 py-4 font-medium text-green-600">₹{item.price}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.category}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-secondary-dark flex items-center gap-2">
                    <Database className="text-primary" />
                    Master Data
                </h1>
                <p className="text-secondary text-sm">Centralized configuration for hospital operations</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
                <div className="flex border-b border-gray-100">
                    {[
                        { id: 'departments', label: 'Departments', icon: Layers },
                        { id: 'wards', label: 'Wards & Beds', icon: Bed },
                        { id: 'tariffs', label: 'Tariffs & Services', icon: CreditCard },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                {renderTable()}
            </div>
        </div>
    );
};

export default MasterData;
