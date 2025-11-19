import React, { useState, useEffect, useMemo } from 'react';
import { getInventory } from '../services/api';
import InventoryOCRForm from '../components/InventoryOCRForm';
import { ShoppingCart, AlertTriangle, Loader, Search } from 'lucide-react';

const InventoryPage = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    // search + filters
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All'); // All / Healthy / LOW STOCK / EXPIRED

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchText.trim().toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [searchText]);

    const fetchInventoryData = async () => {
        try {
            setLoading(true);
            const res = await getInventory();
            const data = res && res.data ? res.data : res;
            setInventory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch inventory:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventoryData();
    }, []);

    const getStatus = (item) => {
        let expiryDate = null;
        if (item.expiryDate) {
            expiryDate = new Date(item.expiryDate);
        }
        const now = new Date();
        if (expiryDate && !isNaN(expiryDate.getTime()) && expiryDate < now) return { text: 'EXPIRED', color: 'bg-red-600' };
        const qty = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity || 0);
        if (qty < 20) return { text: 'LOW STOCK', color: 'bg-yellow-600' };
        return { text: 'Healthy', color: 'bg-green-600' };
    };

    const expiringSoon = inventory.filter(item => {
        if (!item.expiryDate) return false;
        const today = new Date();
        const expiry = new Date(item.expiryDate);
        if (isNaN(expiry.getTime())) return false;
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 90 && diffDays > 0 && (Number(item.quantity) || 0) > 0;
    });

    // combined filter: status + search
    const shownInventory = useMemo(() => {
        const q = debouncedSearch;
        return inventory.filter(item => {
            // status filter
            const st = getStatus(item).text;
            if (statusFilter !== 'All' && st !== statusFilter) return false;

            // search filter (medicine name or batch number)
            if (!q) return true;
            const name = (item.medicine?.name || '').toLowerCase();
            const batch = (item.batchNumber || '').toLowerCase();
            return name.includes(q) || batch.includes(q);
        });
    }, [inventory, debouncedSearch, statusFilter]);

    // onUploadSuccess: called after OCR upload processes — refresh inventory list
    const onUploadSuccess = (res) => {
        fetchInventoryData();
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Medicine Inventory Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* OCR Intake Form */}
                <div className="lg:col-span-1 card">
                    <h2 className="text-2xl font-semibold text-indigo-700 mb-6 flex items-center"><ShoppingCart className="w-6 h-6 mr-3" />New Batch Intake (OCR)</h2>

                    <InventoryOCRForm onSuccess={onUploadSuccess} />

                    <div className="mt-4 flex items-center gap-3">
                        <button className="text-xs text-gray-500 underline" onClick={fetchInventoryData}>
                            Refresh Inventory List
                        </button>
                    </div>
                </div>

                {/* Alerts & Summary */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-yellow-100 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-lg text-yellow-800 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2" /> Expiring Soon
                            </h3>
                            <p className="text-3xl font-bold text-yellow-900">{expiringSoon.length}</p>
                            <p className="text-sm text-yellow-700">Batches expiring in next 90 days.</p>
                        </div>
                        <div className="p-4 bg-red-100 rounded-lg shadow-sm">
                            <h3 className="font-semibold text-lg text-red-800 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2" /> Low Stock Alerts (Triggers)
                            </h3>
                            <p className="text-3xl font-bold text-red-900">{inventory.filter(i => Number(i.quantity) < 20).length}</p>
                            <p className="text-sm text-red-700">Items below minimum quantity threshold.</p>
                        </div>
                    </div>

                    {/* Inventory Table + Controls */}
                    <div className="card overflow-x-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-semibold text-gray-800">Current Stock Levels</h2>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        placeholder="Search medicine or batch..."
                                        className="pl-10 pr-3 py-2 border rounded-md w-72"
                                    />
                                </div>

                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-3 py-2">
                                    <option value="All">All</option>
                                    <option value="Healthy">Healthy</option>
                                    <option value="LOW STOCK">LOW STOCK</option>
                                    <option value="EXPIRED">EXPIRED</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <p className="text-center py-10 text-indigo-600 flex justify-center items-center"><Loader className="w-5 h-5 mr-2 animate-spin" /> Loading stock...</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch No.</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {shownInventory.length === 0 && (
                                        <tr><td colSpan="5" className="py-8 text-center text-gray-400">No items match your filters.</td></tr>
                                    )}
                                    {shownInventory.map(item => {
                                        const status = getStatus(item);
                                        return (
                                            <tr key={item._id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.medicine?.name || 'N/A'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.batchNumber}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-700">{item.quantity}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${status.color}`}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryPage;