import React, { useState } from 'react';
import { getCompatibleDonors } from '../services/api';
import { Droplet, Search, Loader, User } from 'lucide-react';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const DonorsPage = () => {
    const [selectedGroup, setSelectedGroup] = useState('O-');
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusMessage('');
        setDonors([]);

        try {
            const res = await getCompatibleDonors(selectedGroup);
            setDonors(res.data);
            setStatusMessage(`Success! Found ${res.data.length} compatible donors for recipient group ${selectedGroup}.`);
        } catch (error) {
            const msg = error.response?.data?.msg || 'Search failed. Ensure the backend is running.';
            setStatusMessage(`Error: ${msg}`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Blood Bank & Donor Compatibility Search</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Search Form */}
                <div className="lg:col-span-1 card h-fit">
                    <h2 className="text-2xl font-semibold text-red-700 mb-6 flex items-center"><Search className="w-6 h-6 mr-3" />Find Donors</h2>

                    <form className="space-y-4" onSubmit={handleSearch}>
                        <div>
                            <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700 mb-1">Recipient Blood Group</label>
                            <select
                                id="bloodGroup"
                                className="input-field"
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                disabled={loading}
                            >
                                {bloodGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary bg-red-600 hover:bg-red-700 flex items-center justify-center"
                        >
                            {loading ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : <Droplet className="w-5 h-5 mr-2" />}
                            {loading ? 'Searching...' : 'Search Compatible Donors'}
                        </button>
                    </form>
                </div>

                {/* Results Table */}
                <div className="lg:col-span-2 card overflow-x-auto">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Search Results ({donors.length})</h2>

                    {statusMessage && (
                        <div className={`p-3 rounded-lg mb-4 text-sm ${statusMessage.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {statusMessage}
                        </div>
                    )}

                    {loading ? (
                        <p className="text-center py-10 text-indigo-600 flex justify-center items-center"><Loader className="w-5 h-5 mr-2 animate-spin" /> Fetching donors...</p>
                    ) : donors.length > 0 && (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Donation</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {donors.map(donor => (
                                    <tr key={donor._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{donor.user?.firstName} {donor.user?.lastName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-sm leading-5 font-bold rounded-full bg-red-500 text-white">
                                                {donor.bloodGroup}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : 'Never Recorded'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DonorsPage;
