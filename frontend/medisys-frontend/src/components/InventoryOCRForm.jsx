// InventoryOCRForm.jsx
import React, { useState, useRef, useEffect } from 'react';
import { uploadInvoice, listSuppliers } from '../api/invoiceApi';

/**
 * InventoryOCRForm
 * Props:
 *  - onSuccess(response) optional callback called when upload returns success
 *
 * This component accepts PDF invoices and uploads them as multipart field "invoice".
 */
export default function InventoryOCRForm({ onSuccess }) {
    const [file, setFile] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState('');
    const [progress, setProgress] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const s = await listSuppliers();
                setSuppliers(Array.isArray(s) ? s : (s && s.data ? s.data : []));
            } catch (e) {
                // not fatal
                console.warn('Could not load suppliers', e);
            }
        })();
    }, []);

    const handleChoose = (ev) => {
        setError('');
        const f = ev.target.files && ev.target.files[0];
        if (!f) {
            setFile(null);
            return;
        }
        // Accept PDFs only (or optionally images). Guard here so user sees error.
        if (!['application/pdf'].includes(f.type)) {
            setError('Only PDF invoices are supported. Please upload a .pdf file.');
            setFile(null);
            return;
        }
        setFile(f);
    };

    const doUpload = async () => {
        setError('');
        if (!file) {
            setError('Please choose a PDF invoice file first.');
            return;
        }
        setBusy(true);
        setProgress(0);
        try {
            const resp = await uploadInvoice(file, supplierId || undefined, (p) => {
                setProgress(p);
            });
            // resp expected: { msg, autoAdded, needsReview, auditId }
            if (onSuccess && typeof onSuccess === 'function') {
                try { onSuccess(resp); } catch (e) { console.warn('onSuccess handler error', e); }
            }
            // keep UI feedback
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
            setProgress(100);
        } catch (err) {
            console.error('Upload error', err);
            // err may be object { status, body } from uploadInvoice or Error
            let msg = 'Upload failed';
            if (err && typeof err === 'object') {
                if (err.body && err.body.msg) msg = err.body.msg;
                else if (err.body && err.body.error) msg = JSON.stringify(err.body.error);
                else if (err.message) msg = err.message;
                else msg = JSON.stringify(err);
            } else if (typeof err === 'string') msg = err;
            setError(msg);
        } finally {
            setBusy(false);
            // small delay so progress 100 is visible
            setTimeout(() => setProgress(0), 700);
        }
    };

    return (
        <div>
            <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (optional)</label>
                <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="border rounded px-2 py-1 w-full"
                >
                    <option value="">-- none --</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name || s.company || s._id}</option>)}
                </select>
            </div>

            <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Choose invoice (PDF)</label>
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleChoose}
                    className="block w-full"
                />
                {file && <div className="text-sm text-gray-600 mt-1">Selected: {file.name}</div>}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={doUpload}
                    disabled={busy}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? 'Uploading...' : 'Process & Add to Inventory'}
                </button>

                <button
                    onClick={() => {
                        setFile(null); setError(''); setProgress(0);
                        if (inputRef.current) inputRef.current.value = '';
                    }}
                    className="px-3 py-2 border rounded text-sm"
                    disabled={busy}
                >
                    Clear
                </button>

                <div className="ml-3 text-sm text-gray-600">
                    {progress > 0 ? `${progress}%` : ''}
                </div>
            </div>

            {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
    );
}