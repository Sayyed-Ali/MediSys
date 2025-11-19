// src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Home,
    LogOut,
    FileText,
    Users,
    ShoppingCart,
    Activity,
    Droplet,
    Bed,
    DollarSign,
    BarChart2,
    ClipboardList,
    FilePlus2,   // for Reports
} from 'lucide-react';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const location = useLocation();

    if (!user || !user.role) return null;

    const getNavigationLinks = (role) => {
        switch (role) {
            case 'Admin':
                return [
                    { name: 'Dashboard', icon: Home, path: '/dashboard' },
                    { name: 'Admissions/Beds', icon: Bed, path: '/admissions' },
                    { name: 'User Management', icon: Users, path: '/users' },
                    { name: 'Inventory Control', icon: ShoppingCart, path: '/inventory' },
                    { name: 'Review Invoices', icon: ClipboardList, path: '/review' },
                    { name: 'Analytics', icon: BarChart2, path: '/analytics' },
                    { name: 'Billing/Finance', icon: DollarSign, path: '/billing' },
                    // ✅ NEW
                    { name: 'Reports', icon: FilePlus2, path: '/reports' },
                ];

            case 'Staff':
            case 'Nurse':
                return [
                    { name: 'Dashboard', icon: Home, path: '/dashboard' },
                    { name: 'Admissions/Beds', icon: Bed, path: '/admissions' },
                    { name: 'Patient Records', icon: FileText, path: '/patients' },
                    { name: 'Inventory', icon: ShoppingCart, path: '/inventory' },
                    { name: 'Billing', icon: DollarSign, path: '/billing' },
                ];

            case 'Doctor':
                return [
                    { name: 'Dashboard', icon: Home, path: '/dashboard' },
                    { name: 'Patient Records', icon: FileText, path: '/patients' },
                    { name: 'Appointments', icon: Activity, path: '/appointments' },
                    { name: 'Analytics', icon: BarChart2, path: '/analytics' },
                    { name: 'Donors/Blood Bank', icon: Droplet, path: '/donors' },
                    // ✅ NEW
                    { name: 'Reports', icon: FilePlus2, path: '/reports' },
                ];

            case 'PathLab':
                return [
                    { name: 'Dashboard', icon: Home, path: '/dashboard' },
                    { name: 'Upload Report', icon: FileText, path: '/reports/upload' },
                    { name: 'My Reports', icon: ClipboardList, path: '/reports' }
                ];

            case 'Patient':
                return [
                    { name: 'Dashboard', icon: Home, path: '/dashboard' },
                    { name: 'My Appointments', icon: Activity, path: '/appointments' },
                    { name: 'My Billing', icon: DollarSign, path: '/billing' },
                ];

            default:
                return [];
        }
    };

    const links = getNavigationLinks(user.role);

    return (
        <div className="w-64 bg-gradient-to-b from-[#0a2e66] to-[#1b3b8a] text-white flex flex-col p-6 shadow-xl sticky top-0 h-screen">
            {/* Logo / Brand */}
            <div className="text-2xl font-extrabold mb-8 border-b border-indigo-500 pb-4">
                MediSys+
            </div>

            {/* User Info */}
            <div className="mb-8">
                <p className="text-sm font-medium text-indigo-300">Welcome,</p>
                <p className="text-lg font-bold">{user.firstName || 'User'}</p>
                <p className="text-xs text-indigo-400">{user.role}</p>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.name}
                            to={link.path}
                            className={`flex items-center p-3 rounded-lg text-sm font-medium transition-colors
                                ${isActive ? 'bg-[#80B6F4] text-[#0a2e66]' : 'hover:bg-[#4392F1]/30'}
                            `}
                        >
                            <link.icon
                                className={`w-5 h-5 mr-3 ${isActive ? 'text-[#0a2e66]' : 'text-white'}`}
                            />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="pt-4 border-t border-indigo-500">
                <button
                    onClick={logout}
                    className="flex items-center w-full p-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors shadow-md mt-2"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;