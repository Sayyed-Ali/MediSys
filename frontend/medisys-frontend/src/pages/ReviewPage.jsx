import React, { useEffect, useState } from 'react';
import { getPendingReviews, approveReview, rejectReview } from '../api/invoiceReviewApi';
import { CheckCircle, XCircle } from 'lucide-react';

const ReviewPage = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try {
            const res = await getPendingReviews();
            setItems(res.data);
        } catch (e) {
            console.error('Failed to fetch review items', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleApprove = async (id, medicineId, newMedicineName) => {
        await approveReview(id, { medicineId, newMedicineName });
        fetchReviews();
    };
    const handleReject = async (id) => {
        await rejectReview(id);
        fetchReviews();
    };

    if (loading) return <p className="text-center text-indigo-600 mt-10">Loading pending items...</p>;
    if (!items.length)
        return <p className="text-center text-gray-500 mt-10">No pending reviews 🎉</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4">Invoice Review Queue</h1>
            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl shadow">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Description</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Batch</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Expiry</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Qty</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Candidates</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                        <tr key={item._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{item.description}</td>
                            <td className="px-4 py-2">{item.batch}</td>
                            <td className="px-4 py-2">{item.expiry}</td>
                            <td className="px-4 py-2">{item.quantity}</td>
                            <td className="px-4 py-2">
                                {item.candidateMatches?.length ? (
                                    item.candidateMatches.map((c) => (
                                        <div key={c._id} className="text-sm">
                                            {c.medicine?.name} ({Math.round(c.rating * 100)}%)
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-gray-400 text-sm">No suggestions</span>
                                )}
                            </td>
                            <td className="px-4 py-2 flex space-x-2">
                                <button
                                    onClick={() =>
                                        handleApprove(item._id, item.candidateMatches?.[0]?.medicine?._id)
                                    }
                                    className="bg-green-600 text-white px-3 py-1 rounded flex items-center"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleReject(item._id)}
                                    className="bg-red-600 text-white px-3 py-1 rounded flex items-center"
                                >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ReviewPage;