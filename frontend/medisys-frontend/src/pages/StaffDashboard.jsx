import React from 'react';
import { User, DollarSign, ShoppingCart } from 'lucide-react';

const StaffDashboard = () => {
    // Staff/Nurse role focuses on operational tasks like patient admission, inventory management, and billing
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Staff & Nurse Operations Dashboard</h1>
            <p className="text-lg text-gray-600">Your mission is to maintain daily hospital operations, ensuring patient flow and resource availability.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <User className="w-6 h-6 text-indigo-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Admit Patient</h2>
                    <p className="text-sm text-gray-600">Handle patient check-in and assign an available bed (Critical Transaction).</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <ShoppingCart className="w-6 h-6 text-green-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Manage Inventory</h2>
                    <p className="text-sm text-gray-600">Update stock levels and view low-stock and expiry alerts.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <DollarSign className="w-6 h-6 text-yellow-600 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Create Invoice</h2>
                    <p className="text-sm text-gray-600">Generate bills and update payment status for discharged patients.</p>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
