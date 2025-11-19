import React from 'react';
import { Calendar, Droplet, DollarSign } from 'lucide-react';

const PatientDashboard = () => {
    // Patient role focuses on self-service, appointments, and personal billing history.
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Patient Self-Service Portal</h1>
            <p className="text-lg text-gray-600">Manage your appointments and stay informed about your history and billing.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <Calendar className="w-6 h-6 text-indigo-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Book New Appointment</h2>
                    <p className="text-sm text-gray-600">Schedule a visit with your preferred doctor based on specialty and availability.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <DollarSign className="w-6 h-6 text-green-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">View Billing History</h2>
                    <p className="text-sm text-gray-600">Access and check the status of all past and pending invoices.</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300">
                    <Droplet className="w-6 h-6 text-red-500 mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Blood/Organ Donation</h2>
                    <p className="text-sm text-gray-600">Update your donor registry status or view eligibility.</p>
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
