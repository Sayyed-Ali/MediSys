// src/pages/ReportsPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authHeader from '../utils/authHeader';
import { Loader, Check, X, UploadCloud, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const ReportsPage = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState(null);
    const [noteById, setNoteById] = useState({}); // notes keyed by report id

    useEffect(() => {
        fetchReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchReports() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/reports`, {
                headers: { 'Content-Type': 'application/json', ...authHeader() },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.msg || `Failed to fetch reports (${res.status})`);
            }
            const data = await res.json();
            setReports(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load reports:', err);
            setError(err.message || 'Failed to load reports.');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(reportId) {
        if (!window.confirm('Approve this report?')) return;
        setActionLoadingId(reportId);
        try {
            const res = await fetch(`${API_BASE}/api/reports/${reportId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ note: noteById[reportId] || '' }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.msg || `Status ${res.status}`);
            await fetchReports();
        } catch (err) {
            console.error('Approve failed:', err);
            alert('Approve failed: ' + (err.message || err));
        } finally {
            setActionLoadingId(null);
        }
    }

    async function handleRequestRetest(reportId) {
        const reason = noteById[reportId] || '';
        if (!reason && !window.confirm('No note provided. Continue to request retest?')) return;
        setActionLoadingId(reportId);
        try {
            const res = await fetch(`${API_BASE}/api/reports/${reportId}/request-retest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ note: reason }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.msg || `Status ${res.status}`);
            await fetchReports();
        } catch (err) {
            console.error('Request retest failed:', err);
            alert('Request retest failed: ' + (err.message || err));
        } finally {
            setActionLoadingId(null);
        }
    }

    async function handleDelete(reportId) {
        if (!window.confirm('Delete this report? This will remove the file from server.')) return;
        setActionLoadingId(reportId);
        try {
            const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.msg || `Status ${res.status}`);
            await fetchReports();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Delete failed: ' + (err.message || err));
        } finally {
            setActionLoadingId(null);
        }
    }

    // Helper to open/download the file securely with Authorization header
    async function downloadReport(r) {
        try {
            const tokenHeaders = { ...authHeader() };
            if (!tokenHeaders || Object.keys(tokenHeaders).length === 0) {
                alert('No token found — please login again.');
                return;
            }

            const url = `${API_BASE}/api/reports/${r._id}/download`;
            const res = await fetch(url, { headers: tokenHeaders });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.msg || `Failed to fetch file (${res.status})`);
            }

            const blob = await res.blob();

            // Attempt to extract filename from Content-Disposition header
            const cd = res.headers.get('content-disposition') || '';
            let filename = r.fileName || 'report';
            const match = cd.match(/filename\*=UTF-8''(.+)$|filename="?([^;"\n]+)"?/);
            if (match) {
                filename = decodeURIComponent((match[1] || match[2] || filename));
            } else if (r.fileName) {
                filename = r.fileName;
            }

            const blobUrl = URL.createObjectURL(blob);

            // If image or pdf, open in new tab for preview. Otherwise trigger download.
            const mime = blob.type || '';
            if (mime.startsWith('image/') || mime === 'application/pdf') {
                window.open(blobUrl, '_blank');
                // Release the object URL after some time to avoid memory leaks
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
            } else {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 30 * 1000);
            }
        } catch (err) {
            console.error('Download failed:', err);
            alert('Download failed: ' + (err.message || err));
        }
    }

    // small helper to show patient readable value
    const patientLabel = (r) =>
        r.patientIdentifier || r.patientId || r.patientName || '—';

    const assignedDoctorLabel = (r) =>
        r.assignedDoctorName || r.assignedDoctor || '—';

    // Doctor/Admin review UI
    const renderDoctorView = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Reports - Review & Approve</h1>
                <div className="flex items-center gap-4">
                    <button onClick={fetchReports} className="text-sm text-indigo-600">Refresh</button>
                </div>
            </div>

            {loading ? (
                <div className="py-10 text-center text-indigo-600"><Loader className="w-6 h-6 animate-spin inline-block" /> Loading reports...</div>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>
            ) : reports.length === 0 ? (
                <div className="text-gray-500">No reports available.</div>
            ) : (
                <div className="overflow-x-auto bg-white rounded shadow">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 text-sm text-gray-600">
                            <tr>
                                <th className="px-4 py-3 text-left">Patient</th>
                                <th className="px-4 py-3 text-left">Uploaded By</th>
                                <th className="px-4 py-3 text-left">Assigned Doctor</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Uploaded At</th>
                                <th className="px-4 py-3 text-left">Notes / History</th>
                                <th className="px-4 py-3 text-left">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map(r => (
                                <tr key={r._id} className="border-t last:border-b">
                                    <td className="px-4 py-3 text-sm">{patientLabel(r)}</td>
                                    <td className="px-4 py-3 text-sm">{r.uploadedByName || r.uploadedBy || 'PathLab'}</td>
                                    <td className="px-4 py-3 text-sm">{assignedDoctorLabel(r)}</td>
                                    <td className="px-4 py-3 text-sm">{r.status}</td>
                                    <td className="px-4 py-3 text-sm">{r.createdAt ? format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm') : '—'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="mb-2">
                                            <textarea
                                                placeholder="Add a note for approval / retest (optional)"
                                                value={noteById[r._id] || ''}
                                                onChange={e => setNoteById(prev => ({ ...prev, [r._id]: e.target.value }))}
                                                className="w-full border rounded px-2 py-1 text-sm"
                                            />
                                        </div>
                                        <div className="text-xs text-gray-500 max-h-28 overflow-auto">
                                            {Array.isArray(r.history) && r.history.length > 0 ? (
                                                r.history.slice().reverse().map((h, idx) => (
                                                    <div key={idx} className="mb-1">
                                                        <strong>{h.role || h.byRole || (h.byName || 'User')}</strong> — {h.action} {h.note ? `: ${h.note}` : ''} <span className="text-xs text-gray-400">({h.when ? format(new Date(h.when), 'yyyy-MM-dd') : ''})</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="italic text-gray-400">No history</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => handleApprove(r._id)}
                                                className="flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-500 disabled:opacity-60"
                                                disabled={actionLoadingId === r._id}
                                            >
                                                {actionLoadingId === r._id ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                                            </button>

                                            <button
                                                onClick={() => handleRequestRetest(r._id)}
                                                className="flex items-center gap-2 px-3 py-1 rounded bg-yellow-500 text-white text-sm hover:bg-yellow-400"
                                                disabled={actionLoadingId === r._id}
                                            >
                                                <X className="w-4 h-4" /> Request Retest
                                            </button>

                                            {r.fileUrl && (
                                                <button
                                                    onClick={() => downloadReport(r)}
                                                    className="text-xs text-indigo-600 underline flex items-center gap-1"
                                                >
                                                    <FileText className="w-4 h-4" /> View / Download
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // PathLab view: show upload button (link) AND a list of their reports
    const renderPathLabView = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><UploadCloud className="w-6 h-6 text-indigo-600" /> PathLab - My Reports</h1>
                <div className="flex items-center gap-4">
                    <Link to="/reports/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        <UploadCloud className="w-4 h-4" /> Upload Report
                    </Link>
                    <button onClick={fetchReports} className="text-sm text-indigo-600">Refresh</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded shadow">
                {loading ? (
                    <div className="py-10 text-center text-indigo-600"><Loader className="w-6 h-6 animate-spin inline-block" /> Loading...</div>
                ) : error ? (
                    <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>
                ) : reports.length === 0 ? (
                    <div className="text-gray-500">You have no uploaded reports yet. Click Upload Report to add one.</div>
                ) : (
                    <ul className="space-y-3">
                        {reports.map(r => (
                            <li key={r._id} className="border p-4 rounded flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-semibold">{r.fileName || 'Report'}</div>
                                    <div className="text-xs text-gray-500">{patientLabel(r)} • {r.status} • {r.createdAt ? format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm') : ''}</div>
                                    {r.notes && <div className="mt-2 text-sm">{r.notes}</div>}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex gap-2">
                                        {r.fileUrl && (
                                            <button
                                                onClick={() => downloadReport(r)}
                                                className="text-xs text-indigo-600 underline flex items-center gap-1"
                                            >
                                                <FileText className="w-4 h-4" /> View / Download
                                            </button>
                                        )}
                                        <button
                                            onClick={() => downloadReport(r)}
                                            className="text-sm text-gray-700 underline flex items-center gap-1"
                                        >
                                            Download
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDelete(r._id)}
                                            className="inline-flex items-center gap-2 px-3 py-1 rounded border text-sm text-red-600 hover:bg-red-50"
                                            disabled={actionLoadingId === r._id}
                                        >
                                            {actionLoadingId === r._id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );

    // Default read-only list for patients / staff
    const renderReadOnly = () => (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Reports</h1>
            <div className="bg-white rounded shadow p-6">
                {loading ? (
                    <div className="text-indigo-600"><Loader className="w-5 h-5 animate-spin inline-block" /> Loading...</div>
                ) : (
                    <ul className="space-y-3">
                        {reports.map(r => (
                            <li key={r._id} className="border p-3 rounded">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold">{r.fileName || 'Report'}</div>
                                        <div className="text-xs text-gray-500">{patientLabel(r)} • {r.status} • {r.createdAt ? format(new Date(r.createdAt), 'yyyy-MM-dd') : ''}</div>
                                    </div>
                                    <div>
                                        {r.fileUrl && (
                                            <button
                                                onClick={() => downloadReport(r)}
                                                className="text-xs text-indigo-600 underline flex items-center gap-1"
                                            >
                                                <FileText className="w-4 h-4" /> View
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );

    // Main role switch
    if (!user) {
        return <div className="py-20 text-center text-gray-500">Please login to access reports.</div>;
    }

    if (user.role === 'PathLab') return renderPathLabView();
    if (user.role === 'Doctor' || user.role === 'Admin') return renderDoctorView();

    return renderReadOnly();
};

export default ReportsPage;