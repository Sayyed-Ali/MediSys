// src/pages/PathLabUpload.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import authHeader from "../utils/authHeader";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const humanFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + ["B", "KB", "MB", "GB"][i];
};

export default function PathLabUpload({ onUploadSuccess }) {
    const [patientId, setPatientId] = useState("");
    const [assignTo, setAssignTo] = useState(""); // optional doctor id/email
    const [notes, setNotes] = useState("");
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isImagePreview, setIsImagePreview] = useState(false);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef();

    const ACCEPTED_TYPES = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    ];
    const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

    useEffect(() => {
        // cleanup preview URL when component unmounts or file changes
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    function handleFileChange(e) {
        setError("");
        const f = e.target.files && e.target.files[0];
        if (!f) {
            setFile(null);
            setPreviewUrl(null);
            setIsImagePreview(false);
            return;
        }

        if (!ACCEPTED_TYPES.includes(f.type)) {
            setError("Only PDF, JPG, PNG files are allowed.");
            setFile(null);
            setPreviewUrl(null);
            setIsImagePreview(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
            return;
        }

        if (f.size > MAX_SIZE_BYTES) {
            setError(`File is too large. Max allowed: ${humanFileSize(MAX_SIZE_BYTES)}.`);
            setFile(null);
            setPreviewUrl(null);
            setIsImagePreview(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
            return;
        }

        setFile(f);

        if (f.type.startsWith("image/")) {
            const url = URL.createObjectURL(f);
            // revoke previous preview if any
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(url);
            setIsImagePreview(true);
        } else {
            // PDF -> no image preview
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setIsImagePreview(false);
        }
    }

    async function handleUpload(e) {
        e.preventDefault();
        setError("");

        if (!patientId.trim()) {
            setError("Patient ID is required.");
            return;
        }
        if (!file) {
            setError("Please choose a file to upload.");
            return;
        }

        const form = new FormData();
        form.append("report", file);
        form.append("patientId", patientId.trim());
        if (assignTo && assignTo.trim()) form.append("assignedDoctor", assignTo.trim());
        if (notes && notes.trim()) form.append("notes", notes.trim());

        try {
            setUploading(true);
            setProgress(0);

            const headers = { ...authHeader() }; // do NOT set Content-Type manually

            const res = await axios.post(`${API_BASE}/api/reports/upload`, form, {
                headers,
                onUploadProgress: (p) => {
                    const percent = Math.round((p.loaded * 100) / (p.total || file.size));
                    setProgress(percent);
                },
            });

            // success
            setUploading(false);
            setProgress(100);

            // reset form
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = null;
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }
            setIsImagePreview(false);
            setPatientId("");
            setAssignTo("");
            setNotes("");
            setError("");

            // optional callback for parent (ReportsPage) to refresh list
            if (typeof onUploadSuccess === "function") {
                try {
                    onUploadSuccess(res.data);
                } catch (ignore) { }
            }

            // friendly message
            alert(res?.data?.message || "Report uploaded successfully.");
        } catch (err) {
            console.error("Upload failed", err);
            setUploading(false);
            setProgress(0);
            const serverMsg = err?.response?.data?.msg || err?.response?.data?.error;
            setError(serverMsg || err.message || "Upload failed — check server logs.");
        }
    }

    return (
        <div className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Upload Pathology Report</h2>

            <form onSubmit={handleUpload} className="max-w-2xl">
                <label className="block mb-2 text-sm font-medium text-gray-700">Patient ID</label>
                <input
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full mb-4 p-3 rounded border"
                />

                <label className="block mb-2 text-sm font-medium text-gray-700">Assign to Doctor (optional)</label>
                <input
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    placeholder="Doctor ID or email"
                    className="w-full mb-4 p-3 rounded border"
                />

                <label className="block mb-2 text-sm font-medium text-gray-700">Choose File (PDF, JPG, PNG)</label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="mb-3"
                />

                {file && (
                    <div className="mb-3 flex items-center gap-4">
                        <div className="flex-shrink-0">
                            {isImagePreview && previewUrl ? (
                                <img src={previewUrl} alt="preview" className="w-28 h-20 object-cover rounded border" />
                            ) : (
                                <div className="w-28 h-20 flex items-center justify-center bg-gray-100 border rounded">
                                    <div className="text-sm text-gray-700 text-center">
                                        <strong>PDF</strong>
                                        <div className="text-xs mt-1">{file.name}</div>
                                        <div className="text-xs text-gray-500">{humanFileSize(file.size)}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="text-sm font-medium">{file.name}</div>
                            <div className="text-xs text-gray-500">{humanFileSize(file.size)}</div>
                            <button
                                type="button"
                                onClick={() => {
                                    setFile(null);
                                    if (previewUrl) {
                                        URL.revokeObjectURL(previewUrl);
                                        setPreviewUrl(null);
                                    }
                                    setIsImagePreview(false);
                                    if (fileInputRef.current) fileInputRef.current.value = null;
                                }}
                                className="mt-2 px-3 py-1 text-sm border rounded text-red-600"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}

                <label className="block mb-2 text-sm font-medium text-gray-700">Lab notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full p-3 mb-4 rounded border" />

                {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={uploading}
                        className={`px-5 py-2 rounded text-white ${uploading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
                    >
                        {uploading ? `Uploading ${progress}%` : "Upload"}
                    </button>

                    {uploading && (
                        <div className="w-56 bg-gray-200 rounded overflow-hidden">
                            <div style={{ width: `${progress}%` }} className="h-2 bg-green-500" />
                        </div>
                    )}
                </div>
            </form>

            <div className="mt-8 text-xs text-gray-500">
                Allowed file types: PDF, JPG, PNG. Max size: 8 MB (adjustable on server). Images will be previewed; PDFs will show file info.
            </div>
        </div>
    );
}