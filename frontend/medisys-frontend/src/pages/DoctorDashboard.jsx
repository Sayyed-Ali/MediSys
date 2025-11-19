import React from 'react';
import { Stethoscope, FileText, Activity, Droplet } from 'lucide-react';

const DoctorDashboard = () => {
    // Doctor role focuses on patient care, records, and specialized data like donors.
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Doctor Portal Dashboard</h1>
            <p className="text-lg text-gray-600">Access patient history, manage appointments, and utilize decision support tools.</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <Activity className="w-6 h-6 text-red-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Upcoming Appointments</h2>
                    <p className="text-sm text-gray-600">View today's schedule and check patient history before consultation.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <FileText className="w-6 h-6 text-blue-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Patient Records</h2>
                    <p className="text-sm text-gray-600">Search and update medical history for all admitted and external patients.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <Droplet className="w-6 h-6 text-gray-700 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Blood Bank Search</h2>
                    <p className="text-sm text-gray-600">Find compatible blood and organ donors instantly.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <Stethoscope className="w-6 h-6 text-green-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Risk/Demand Analytics</h2>
                    <p className="text-sm text-gray-600">Access predictive models for patient risk scoring and medicine demand.</p>
                </div>
            </div>
        </div>
    );
};

export default DoctorDashboard;
