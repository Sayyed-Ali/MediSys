import React, { useState, useEffect } from 'react';
import { getPatients } from '../services/api';
import { FileText, Search, Loader } from 'lucide-react';

const PatientRecordsPage = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                // Ensure the user has the correct role for this endpoint (handled by backend middleware)
                const res = await getPatients();
                setPatients(res.data);
            } catch (error) {
                console.error("Failed to fetch patients:", error);
                // Optionally show error to user
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const filteredPatients = patients.filter(p =>
        p.user && p.user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyle = (isAdmitted) => isAdmitted
        ? 'bg-red-100 text-red-800'
        : 'bg-green-100 text-green-800';

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Patient Records & History</h1>

            <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                    <Search className="w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by Patient Name..."
                        className="input-field"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <p className="text-center py-10 text-indigo-600 flex justify-center items-center"><Loader className="w-5 h-5 mr-2 animate-spin" /> Fetching patient data...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latest Diagnosis</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredPatients.map(patient => (
                                    <tr key={patient._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.user?.firstName} {patient.user?.lastName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.contactNumber || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {patient.medicalHistory?.length > 0 ? patient.medicalHistory[patient.medicalHistory.length - 1].diagnosis : 'No History'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(patient.isAdmitted)}`}>
                                                {patient.isAdmitted ? 'ADMITTED' : 'EXTERNAL'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button className="text-indigo-600 hover:text-indigo-900">View Full History</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientRecordsPage;