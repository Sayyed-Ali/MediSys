// src/components/UploadInvoice.jsx
import React, { useEffect, useState } from 'react';
import { uploadInvoice, listSuppliers, listMedicines, createInventory } from '../api/invoiceApi';

export default function UploadInvoice() {
    const [file, setFile] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState('');
    const [progress, setProgress] = useState(0);
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [medicines, setMedicines] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        // Load suppliers and medicines for approvals
        (async () => {
            try {
                const s = await listSuppliers();
                setSuppliers(Array.isArray(s) ? s : []);
            } catch (err) {
                console.warn('Could not load suppliers:', err);
            }
            try {
                const m = await listMedicines();
                setMedicines(Array.isArray(m) ? m : []);
            } catch (err) {
                console.warn('Could not load medicines:', err);
            }
        })();
    }, []);

    const handleFile = (e) => {
        setFile(e.target.files[0] || null);
        setResponse(null);
        setProgress(0);
        setError('');
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please choose a PDF invoice to upload.');
            return;
        }
        setLoading(true);
        setError('');
        setProgress(0);
        try {
            const res = await uploadInvoice(file, supplierId || undefined, (p) => setProgress(p));
            setResponse(res);
        } catch (err) {
            console.error(err);
            setError(err?.body?.msg || err?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const approveRow = async (row, selectedMedicineId) => {
        try {
            const inv = {
                medicine: selectedMedicineId,
                batchNumber: row.batch || 'UNKNOWN',
                quantity: Number(row.quantity || 0),
            };
            if (row.expiry) {
                // convert MM/YYYY or other formats into ISO if possible on client side
                // Let backend handle parsing — it is robust. We can send raw string.
                inv.expiryDate = row.expiry;
            }
            if (supplierId) inv.supplier = supplierId;

            await createInventory(inv);
            // Update UI: move this row from needsReview to autoAdded (simple approach)
            setResponse((prev) => {
                if (!prev) return prev;
                const needs = prev.needsReview.filter(n => n.row !== row);
                const auto = prev.autoAdded.concat([{ row, inventoryId: 'manual', medicine: medicines.find(m => m._id === selectedMedicineId)?.name || selectedMedicineId, rating: 1 }]);
                return { ...prev, needsReview: needs, autoAdded: auto };
            });
        } catch (err) {
            console.error('Approve error', err);
            alert('Could not create inventory: ' + (err.msg || err.message || JSON.stringify(err)));
        }
    };

    return (
        <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
            <h2>Upload Supplier Invoice (PDF)</h2>

            <div style={{ marginBottom: 12 }}>
                <label>Supplier (optional): </label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value=''>-- none --</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name || s.company || s._id}</option>)}
                </select>
            </div>

            <div style={{ marginBottom: 12 }}>
                <input type="file" accept="application/pdf" onChange={handleFile} />
            </div>

            <div style={{ marginBottom: 12 }}>
                <button onClick={handleUpload} disabled={loading}>{loading ? 'Uploading...' : 'Upload Invoice'}</button>
                {progress > 0 && <span style={{ marginLeft: 12 }}>{progress}%</span>}
            </div>

            {error && <div style={{ color: 'crimson' }}>{error}</div>}

            {response && (
                <div style={{ marginTop: 20 }}>
                    <h3>Result</h3>
                    <p><strong>Auto-added:</strong> {response.autoAdded?.length || 0}</p>
                    <ul>
                        {response.autoAdded?.map((a, idx) => (
                            <li key={idx}>
                                {a.row.description} — qty: {a.row.quantity} — medicine: {a.medicine} — invId: {a.inventoryId}
                            </li>
                        ))}
                    </ul>

                    <h3>Needs review</h3>
                    {response.needsReview?.length === 0 && <div>None</div>}
                    {response.needsReview?.map((nr, idx) => (
                        <div key={idx} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
                            <div><strong>{nr.row.description}</strong></div>
                            <div>Batch: {nr.row.batch} | Expiry: {nr.row.expiry} | Qty: {nr.row.quantity}</div>

                            <div style={{ marginTop: 8 }}>
                                <label>Pick medicine to map: </label>
                                <select id={`med-${idx}`}>
                                    <option value=''>-- choose --</option>
                                    {medicines.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                                </select>
                                <button style={{ marginLeft: 8 }} onClick={() => {
                                    const sel = document.getElementById(`med-${idx}`).value;
                                    if (!sel) { alert('Select a medicine first'); return; }
                                    approveRow(nr.row, sel);
                                }}>Approve & Add</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}