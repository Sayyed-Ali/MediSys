// src/pages/AnalyticsPage.jsx
import React, { useState, useEffect } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    LineChart,
    Line,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function AnalyticsPage() {
    const [months, setMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [demandPredictions, setDemandPredictions] = useState([]);
    const [diseasePredictions, setDiseasePredictions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [riskInput, setRiskInput] = useState({
        age: 55,
        bp: "130/85",
        hr: 82,
        isSmoker: false,
        condition: "None",
    });
    const [riskResult, setRiskResult] = useState(null);

    useEffect(() => {
        // load metadata (months, medicines, diseases)
        fetch(`${API_BASE}/api/analytics/metadata`)
            .then((r) => r.json())
            .then((data) => {
                if (data && data.months && data.months.length) {
                    setMonths(data.months);
                    setSelectedMonth(data.months[data.months.length - 1]);
                }
            })
            .catch((err) => console.error("metadata error:", err));
    }, []);

    async function fetchPredictions(month) {
        if (!month) return;
        setLoading(true);
        try {
            const [dRes, disRes] = await Promise.all([
                fetch(`${API_BASE}/api/predict/demand`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ month }),
                }).then((r) => r.json()),
                fetch(`${API_BASE}/api/predict/disease`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ month }),
                }).then((r) => r.json()),
            ]);

            setDemandPredictions(dRes.predictions || []);
            setDiseasePredictions(disRes.predictions || []);
        } catch (err) {
            console.error("fetchPredictions error:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (selectedMonth) fetchPredictions(selectedMonth);
    }, [selectedMonth]);

    async function handlePredictRisk() {
        setRiskResult(null);
        try {
            const res = await fetch(`${API_BASE}/api/predict/risk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    age: Number(riskInput.age),
                    isSmoker: Boolean(riskInput.isSmoker),
                    hr: Number(riskInput.hr),
                    bp: riskInput.bp,
                    condition: riskInput.condition,
                }),
            });
            const data = await res.json();
            setRiskResult(data);
        } catch (err) {
            console.error("risk call failed:", err);
        }
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen space-y-8">
            <h1 className="text-3xl font-bold text-indigo-700">📊 Hospital Analytics Dashboard</h1>

            {/* Controls */}
            <div className="flex items-center gap-4">
                <label className="font-medium">Select Month:</label>
                <select
                    value={selectedMonth || ""}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border rounded p-2"
                >
                    {months.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => fetchPredictions(selectedMonth)}
                    className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
                >
                    Refresh
                </button>
                {loading && <div className="text-sm text-gray-600 ml-3">Loading predictions...</div>}
            </div>

            {/* Demand chart */}
            <div className="bg-white p-6 rounded-2xl shadow">
                <h2 className="text-xl font-semibold mb-4">💊 Medicine Demand Forecast</h2>
                <div style={{ width: "100%", height: 360 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demandPredictions}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="medicine" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="predicted_demand" fill="#6366f1" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Disease chart */}
            <div className="bg-white p-6 rounded-2xl shadow">
                <h2 className="text-xl font-semibold mb-4">🦠 Seasonal Disease Trend Forecast</h2>
                <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={diseasePredictions}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="disease" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="predicted_cases" stroke="#10b981" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Risk form */}
            <div className="bg-white p-6 rounded-2xl shadow">
                <h2 className="text-xl font-semibold mb-4">🧬 Patient Risk Estimation</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        className="border rounded px-3 py-2"
                        type="number"
                        placeholder="Age"
                        value={riskInput.age}
                        onChange={(e) => setRiskInput({ ...riskInput, age: e.target.value })}
                    />
                    <input
                        className="border rounded px-3 py-2"
                        placeholder="BP (e.g. 130/85)"
                        value={riskInput.bp}
                        onChange={(e) => setRiskInput({ ...riskInput, bp: e.target.value })}
                    />
                    <input
                        className="border rounded px-3 py-2"
                        type="number"
                        placeholder="Heart rate"
                        value={riskInput.hr}
                        onChange={(e) => setRiskInput({ ...riskInput, hr: e.target.value })}
                    />
                    <select
                        className="border rounded px-3 py-2"
                        value={riskInput.condition}
                        onChange={(e) => setRiskInput({ ...riskInput, condition: e.target.value })}
                    >
                        {["None", "Diabetes", "Hypertension", "Cardiac", "Asthma"].map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>

                    <label className="flex items-center space-x-2 mt-2 md:mt-0">
                        <input
                            type="checkbox"
                            checked={riskInput.isSmoker}
                            onChange={(e) => setRiskInput({ ...riskInput, isSmoker: e.target.checked })}
                        />
                        <span>Smoker</span>
                    </label>

                    <div className="md:col-span-3 flex items-center gap-3">
                        <button onClick={handlePredictRisk} className="bg-green-600 text-white px-4 py-2 rounded">
                            Predict Risk
                        </button>
                        {riskResult && (
                            <div className="p-3 bg-gray-50 rounded">
                                <div>
                                    <strong>Risk score:</strong>{" "}
                                    <span
                                        className={
                                            riskResult.risk_score > 0.7 ? "text-red-600" : riskResult.risk_score > 0.4 ? "text-yellow-600" : "text-green-600"
                                        }
                                    >
                                        {(riskResult.risk_score * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div>
                                    <strong>Flag:</strong> {riskResult.risk_flag ? "⚠️ High risk" : "✅ Low risk"}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}