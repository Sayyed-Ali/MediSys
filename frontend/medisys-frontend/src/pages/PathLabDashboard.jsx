// src/pages/PathLabDashboard.jsx
import React from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const PathLabDashboard = () => {
    return (
        <div className="space-y-6 p-8 bg-white min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900">PathLab Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 rounded-xl shadow-sm bg-white">
                    <h2 className="text-lg font-semibold mb-2">Upload Report</h2>
                    <p className="text-sm text-gray-600 mb-4">Upload pathology reports for assigned patients.</p>
                    <Link to="/reports/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded">
                        <UploadCloud className="w-4 h-4" /> Upload Report
                    </Link>
                </div>

                <div className="card p-6 rounded-xl shadow-sm bg-white">
                    <h2 className="text-lg font-semibold mb-2">Pending Approvals</h2>
                    <p className="text-sm text-gray-600 mb-4">View reports awaiting doctor approval (if implemented).</p>
                    <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 rounded">
                        <FileText className="w-4 h-4" /> View Reports
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PathLabDashboard;