// src/pages/AdmissionsPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const ROOM_CAPACITY = {
    General: 10,
    "Semi-Private": 5,
    Private: 3,
    ICU: 5,
};

export default function AdmissionsPage() {
    const { token, user } = useAuth();
    const [form, setForm] = useState({
        patientName: "",
        age: "",
        gender: "Male",
        roomType: "General",
        doctor: "",
    });
    const [admissions, setAdmissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});
    async function loadAdmissions() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admissions`, { headers: authHeaders() });
            if (!res.ok) throw new Error(`Load failed: ${res.status}`);
            const data = await res.json();
            setAdmissions(data);
        } catch (err) {
            console.error("Load admissions error:", err);
            setErrorMsg("Failed to load admissions.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAdmissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function admitPatient(e) {
        e && e.preventDefault();
        setStatusMsg(null);
        setErrorMsg(null);

        if (!form.patientName || !form.roomType) {
            setErrorMsg("Patient name and room type are required.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({
                    patientName: form.patientName,
                    age: form.age ? Number(form.age) : undefined,
                    gender: form.gender,
                    roomType: form.roomType,
                    doctor: form.doctor,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                console.error("Admit failed:", data);
                setErrorMsg((data && data.error) || (data && data.msg) || "Admission failed");
                return;
            }

            setStatusMsg("Patient admitted successfully.");
            setForm({ patientName: "", age: "", gender: "Male", roomType: "General", doctor: "" });
            loadAdmissions();
        } catch (err) {
            console.error("Admit error:", err);
            setErrorMsg("Failed to admit patient (network).");
        }
    }

    async function updateRoom(admissionId, newRoomType, setRowStatus) {
        setRowStatus({ saving: true, error: null });
        try {
            const res = await fetch(`${API_BASE}/api/admissions/${admissionId}/room`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify({ roomType: newRoomType }),
            });
            const data = await res.json();
            if (!res.ok) {
                console.error("Update room failed:", data);
                setRowStatus({ saving: false, error: (data && data.error) || "Failed to update" });
                return;
            }
            setRowStatus({ saving: false, error: null });
            setStatusMsg("Room updated.");
            loadAdmissions();
        } catch (err) {
            console.error("Update room error:", err);
            setRowStatus({ saving: false, error: "Network error" });
        }
    }

    const counts = admissions.reduce(
        (acc, a) => {
            acc[a.roomType] = (acc[a.roomType] || 0) + 1;
            return acc;
        },
        { General: 0, "Semi-Private": 0, Private: 0, ICU: 0 }
    );

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-indigo-700 mb-6">Patient Admissions & Beds</h1>

            {/* Occupancy summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {Object.keys(ROOM_CAPACITY).map((rt) => {
                    const cap = ROOM_CAPACITY[rt];
                    const occ = counts[rt] || 0;
                    const pct = Math.min(100, Math.round((occ / cap) * 100));
                    return (
                        <div key={rt} className="bg-white p-4 rounded-lg shadow">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-gray-500">{rt}</div>
                                    <div className="text-2xl font-bold">{occ} / {cap}</div>
                                </div>
                                <div className="text-xs text-gray-400">{pct}%</div>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded mt-3 overflow-hidden">
                                <div className={`h-2 rounded`} style={{ width: `${pct}%`, background: "#6366F1" }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Admit form */}
            <form onSubmit={admitPatient} className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-xl font-semibold mb-4">Admit New Patient</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        placeholder="Patient Name"
                        value={form.patientName}
                        onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                        className="border rounded px-3 py-2"
                    />
                    <input
                        placeholder="Age"
                        type="number"
                        value={form.age}
                        onChange={(e) => setForm({ ...form, age: e.target.value })}
                        className="border rounded px-3 py-2"
                    />
                    <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="border rounded px-3 py-2"
                    >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>

                    <select
                        value={form.roomType}
                        onChange={(e) => setForm({ ...form, roomType: e.target.value })}
                        className="border rounded px-3 py-2"
                    >
                        <option>General</option>
                        <option>Semi-Private</option>
                        <option>Private</option>
                        <option>ICU</option>
                    </select>

                    <input
                        placeholder="Assigned Doctor"
                        value={form.doctor}
                        onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                        className="border rounded px-3 py-2 col-span-2 md:col-span-2"
                    />

                    <div className="md:col-span-3 flex items-center space-x-3">
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                            Admit Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ patientName: "", age: "", gender: "Male", roomType: "General", doctor: "" })}
                            className="px-4 py-2 rounded border"
                        >
                            Clear
                        </button>
                        {statusMsg && <div className="text-green-600 ml-3">{statusMsg}</div>}
                        {errorMsg && <div className="text-red-600 ml-3">{errorMsg}</div>}
                    </div>
                </div>
            </form>

            {/* Current admitted patients */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Current Admitted Patients</h2>

                {loading ? (
                    <div>Loading...</div>
                ) : admissions.length === 0 ? (
                    <div className="text-gray-500">No current admissions.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-sm text-gray-600 border-b">
                                <th className="py-3">Patient</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Room Type</th>
                                <th>Doctor</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admissions.map((a) => (
                                <PatientRow
                                    key={a._id}
                                    admission={a}
                                    token={token}
                                    onUpdated={() => loadAdmissions()}
                                    updateRoomFn={updateRoom}
                                    currentUser={user}
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

/* Small child row component to keep local state for update UI */
function PatientRow({ admission, token, onUpdated, updateRoomFn }) {
    const [roomType, setRoomType] = useState(admission.roomType);
    const [rowStatus, setRowStatus] = useState({ saving: false, error: null });

    useEffect(() => {
        setRoomType(admission.roomType);
    }, [admission.roomType]);

    return (
        <tr className="border-b">
            <td className="py-3">{admission.patientName}</td>
            <td>{admission.age ?? "-"}</td>
            <td>{admission.gender}</td>
            <td>
                <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    onBlur={() => {
                        if (roomType !== admission.roomType) updateRoomFn(admission._id, roomType, setRowStatus);
                    }}
                    className="border rounded px-2 py-1"
                >
                    <option>General</option>
                    <option>Semi-Private</option>
                    <option>Private</option>
                    <option>ICU</option>
                </select>
                {rowStatus.saving && <div className="text-xs text-gray-500"> Saving... </div>}
                {rowStatus.error && <div className="text-xs text-red-600"> {rowStatus.error} </div>}
            </td>
            <td>{admission.doctor || "-"}</td>
            <td className="text-green-600">{admission.status}</td>
            <td>
                {/* future: Cancel / Discharge actions */}
                <button className="text-indigo-600 underline" onClick={() => alert("Cancel/Discharge not implemented")}>
                    Cancel
                </button>
            </td>
        </tr>
    );
}