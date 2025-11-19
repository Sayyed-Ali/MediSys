import React, { useState, useEffect } from 'react';
import { getDemandPredictions } from '../api/analyticsApi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

const AnalyticsPage = () => {
    const [month, setMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [loading, setLoading] = useState(false);
    const [predictions, setPredictions] = useState([]);
    const [error, setError] = useState(null);

    // Optional: auto-query on first render
    useEffect(() => {
        handleQuery();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleQuery = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getDemandPredictions(month);

            // Normalize shape: handle array or object
            const dataArray = Array.isArray(res)
                ? res
                : Array.isArray(res?.predictions)
                    ? res.predictions
                    : [];

            setPredictions(dataArray);
        } catch (err) {
            console.error('Analytics demand error:', err);

            // Handle 401 or network errors gracefully
            if (err?.status === 401 || /unauthorized/i.test(err?.message)) {
                setError('Unauthorized – please log in again.');
            } else {
                setError(
                    err?.body?.msg ||
                    err?.body?.message ||
                    err?.message ||
                    'Failed to fetch analytics data.'
                );
            }

            setPredictions([]); // clear old data on error
        } finally {
            setLoading(false);
        }
    };

    const chartData = predictions.map((p) => ({
        name: p.medicine || p.item || 'Unknown',
        value: Number(p.predicted_demand) || Number(p.demand) || 0,
    }));

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">
                Analytics & Demand Forecast
            </h1>

            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Select month</label>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="border rounded px-3 py-1"
                />
                <button
                    onClick={handleQuery}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    disabled={loading}
                >
                    {loading ? 'Querying…' : 'Get Predictions'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded text-sm">
                    {typeof error === 'string' ? error : JSON.stringify(error)}
                </div>
            )}

            <div className="card p-4 bg-white shadow-sm">
                <h2 className="text-xl font-semibold mb-3">Demand Predictions</h2>

                {loading ? (
                    <p className="text-gray-500 text-sm">Fetching predictions...</p>
                ) : predictions.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        No data yet. Click “Get Predictions” to query the analytics service.
                    </p>
                ) : (
                    <div style={{ width: '100%', height: 360, minWidth: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    angle={-30}
                                    textAnchor="end"
                                    interval={0}
                                    height={70}
                                />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" name="Predicted Demand" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsPage;