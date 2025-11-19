import React, { useState, useEffect } from 'react';
import { getBeds, getPatients, getInventory } from '../services/api';
import InventoryOCRForm from '../components/InventoryOCRForm';
import { User, Bed, Droplet, BarChart2, Loader, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Define colors for each card based on theme
const COLOR_PATIENT = 'bg-gradient-to-r from-[#4392F1] to-[#80B6F4]';
const COLOR_AVAILABLE = 'bg-gradient-to-r from-[#80B6F4] to-[#B4D3F8]';
const COLOR_OCCUPIED = 'bg-gradient-to-r from-[#B4D3F8] to-[#d6e0fc]';
const COLOR_ALERTS = 'bg-gradient-to-r from-[#FFCC00] to-[#FFD633]';
const COLOR_ROLE = 'bg-gradient-to-r from-[#6ee7b7] to-[#3b82f6]';

const Card = ({ title, value, icon: Icon, colorClass }) => (
    <div className={`card p-6 rounded-xl shadow-lg text-white ${colorClass} border-b-4 border-white`}>
        <div className="flex items-center justify-start mb-3">
            <Icon className="w-8 h-8 mr-4 opacity-90" />
            <p className="text-4xl font-extrabold">{value}</p>
        </div>
        <p className="text-sm font-semibold">{title}</p>
    </div>
);

const AdminDashboard = () => {
    const { user } = useAuth(); // ✅ get current logged-in user + role
    const role = user?.role || 'User';

    const [stats, setStats] = useState({
        beds: 0,
        patients: 0,
        lowStock: 0,
        occupiedBeds: 0
    });
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoadingError(false);

                // fetch all in parallel
                const [bedsRes, patientsRes, inventoryRes] = await Promise.allSettled([
                    getBeds(),
                    getPatients(),
                    getInventory()
                ]);

                const bedsData = bedsRes.value?.data || [];
                const totalBeds = bedsData.length;
                const occupiedBeds = bedsData.filter(b => b.status === 'Occupied').length;

                setStats({
                    beds: totalBeds,
                    patients: patientsRes.value?.data?.length || 0,
                    lowStock: inventoryRes.value?.data?.filter(i => i.quantity < 20)?.length || 0,
                    occupiedBeds: occupiedBeds
                });
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                setLoadingError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="text-center text-gray-500 py-20 flex justify-center items-center">
                <Loader className="w-6 h-6 mr-3 animate-spin" /> Loading Overview Data...
            </div>
        );
    }

    // role-based visibility
    const isAdmin = role.toLowerCase() === 'admin';
    const isPharmacist = role.toLowerCase() === 'pharmacist';
    const isDoctor = role.toLowerCase() === 'doctor';

    return (
        <div className="space-y-10 bg-white min-h-screen p-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Hospital Dashboard</h1>

            {/* show role at top */}
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-gray-600">Logged in as: {role}</span>
            </div>

            {loadingError && (
                <div className="p-3 mt-4 bg-yellow-100 border-l-4 border-yellow-600 text-yellow-800 rounded-lg shadow-sm flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">
                        Warning: Failed to load some live data. Ensure backend services are running.
                    </span>
                </div>
            )}

            {/* Overview Cards (based on role) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Everyone can see patient and bed stats */}
                <Card title="Total Patients" value={stats.patients} icon={User} colorClass={COLOR_PATIENT} />
                <Card
                    title="Available Beds"
                    value={stats.beds - stats.occupiedBeds}
                    icon={Bed}
                    colorClass={COLOR_AVAILABLE}
                />
                <Card title="Occupied Beds" value={stats.occupiedBeds} icon={Bed} colorClass={COLOR_OCCUPIED} />

                {/* Admin & Pharmacist can see low-stock alerts */}
                {(isAdmin || isPharmacist) && (
                    <Card title="Low Stock Alerts" value={stats.lowStock} icon={Droplet} colorClass={COLOR_ALERTS} />
                )}

                {/* Admin only card */}
                {isAdmin && (
                    <Card title="System Role Access" value="Admin Panel" icon={Shield} colorClass={COLOR_ROLE} />
                )}
            </div>

            {/* OCR & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
                {/* OCR Module */}
                {(isAdmin || isPharmacist) && (
                    <div className="card p-8 bg-white border border-gray-100 shadow-md rounded-xl">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                            OCR Assisted Inventory Intake
                        </h2>
                        <p className="text-sm text-gray-600 mb-5">
                            Quickly register new medicine batches by uploading the label image for automated data extraction.
                        </p>
                        <InventoryOCRForm />
                    </div>
                )}

                {/* Analytics Summary */}
                <div className="card p-8 bg-white border border-gray-100 shadow-md rounded-xl">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">Key Analytics Summary</h2>
                    <div className="space-y-5">
                        {/* Risk Flags */}
                        <div className="bg-[#f0f5ff] p-4 rounded-lg shadow-sm">
                            <p className="text-sm font-medium text-[#0a2e66]">Patient Risk Flags</p>
                            <ul className="list-disc list-inside text-lg font-bold text-red-600 mt-2 ml-4">
                                <li>3 High Risk</li>
                            </ul>
                        </div>

                        {/* Medicine Forecast */}
                        <div className="bg-[#e8fff0] p-4 rounded-lg shadow-sm">
                            <p className="text-sm font-medium text-[#0a2e66]">Medicine Demand Forecast</p>
                            <p className="text-lg font-bold text-green-700 mt-1">Model Active</p>
                        </div>

                        <button
                            onClick={() => window.location.href = '/analytics'}
                            className="w-full py-3 px-4 bg-[#eaf3ff] text-[#0a2e66] font-semibold rounded-lg hover:bg-[#d8e8ff] transition-colors shadow-sm"
                        >
                            View Detailed Analytics Reports
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;