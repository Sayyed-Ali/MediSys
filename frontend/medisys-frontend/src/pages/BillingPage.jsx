import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import authHeader from "../utils/authHeader";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function formatDate(ts) {
    try {
        const d = new Date(ts);
        return d.toLocaleString();
    } catch {
        return ts;
    }
}

const BillingPage = () => {
    const { user } = useAuth();
    const [patientName, setPatientName] = useState("");
    const [status, setStatus] = useState("Paid");
    const [items, setItems] = useState([
        { name: "", quantity: 1, unitPrice: 0.0, description: "" },
    ]);
    const [medicines, setMedicines] = useState([]); // master list for autocomplete
    const [suggestions, setSuggestions] = useState([]); // suggestion list for each item (index-based)
    const [recent, setRecent] = useState([]);
    const [message, setMessage] = useState(null);
    const [invoiceTotal, setInvoiceTotal] = useState(0);
    const [modalInvoice, setModalInvoice] = useState(null);
    const suggestionsRef = useRef({}); // hold refs for suggestion boxes

    useEffect(() => {
        fetchMedicines();
        fetchRecentInvoices();
    }, []);

    useEffect(() => {
        // compute invoice total whenever items change
        const total = items.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
        setInvoiceTotal(total);
    }, [items]);

    async function fetchMedicines() {
        try {
            const res = await fetch(`${API_BASE}/api/medicines`, {
                headers: { "Content-Type": "application/json", ...authHeader() },
            });
            if (!res.ok) throw new Error("Failed to load medicines");
            const data = await res.json();
            // Expect array of medicines: { _id, name, ... }
            setMedicines(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn("Could not fetch medicines:", err.message || err);
            setMedicines([]);
        }
    }

    async function fetchRecentInvoices() {
        try {
            const res = await fetch(`${API_BASE}/api/billing`, {
                headers: { "Content-Type": "application/json", ...authHeader() },
            });
            if (!res.ok) throw new Error("Failed to fetch invoices");
            const data = await res.json();
            setRecent(Array.isArray(data) ? data : []);
        } catch (err) {
            console.warn("Fetch invoices error:", err.message || err);
            setRecent([]);
        }
    }

    // prefix-match suggestions only (startsWith)
    function handleNameInputChange(index, value) {
        const newItems = [...items];
        newItems[index].name = value;
        setItems(newItems);

        if (!value) {
            setSuggestions((s) => ({ ...s, [index]: [] }));
            return;
        }
        const q = String(value).trim().toLowerCase();

        const filtered = medicines
            .filter((m) => (m.name || "").toLowerCase().startsWith(q))
            .slice(0, 8);

        setSuggestions((s) => ({ ...s, [index]: filtered }));
    }

    function selectSuggestion(index, med) {
        const newItems = [...items];
        newItems[index].name = med.name;
        setItems(newItems);
        setSuggestions((s) => ({ ...s, [index]: [] }));
    }

    function addItem() {
        setItems([...items, { name: "", quantity: 1, unitPrice: 0.0, description: "" }]);
    }

    function removeItem(i) {
        const copy = items.slice();
        copy.splice(i, 1);
        setItems(copy.length ? copy : [{ name: "", quantity: 1, unitPrice: 0.0, description: "" }]);
    }

    function updateItem(i, field, value) {
        const copy = [...items];
        copy[i][field] = value;
        setItems(copy);
    }

    async function createInvoice(e) {
        e.preventDefault();
        setMessage(null);

        // Basic validation
        const validItems = items.filter(it => it.name && Number(it.quantity) > 0);
        if (validItems.length === 0) {
            setMessage({ type: "error", text: "Invoice must contain at least one valid item." });
            return;
        }

        const payload = {
            patientName: patientName || "N/A",
            items: items.map(it => ({
                name: it.name,
                quantity: Number(it.quantity || 0),
                unitPrice: Number(it.unitPrice || 0),
                description: it.description || ""
            })),
            totalAmount: Number(invoiceTotal || 0),
            status
        };

        try {
            const res = await fetch(`${API_BASE}/api/billing`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeader() },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) {
                const errStr = (json && json.error) ? JSON.stringify(json) : `Status ${res.status}`;
                setMessage({ type: "error", text: `Failed to create invoice: ${errStr}` });
                return;
            }

            // on success: show inventory updates + refresh list
            let successMsg = "Invoice created.";
            if (json.inventoryUpdates && json.inventoryUpdates.length) {
                successMsg += " Inventory updated: " + json.inventoryUpdates
                    .map(u => `${u.itemName} -${u.taken} (batch ${u.batchNumber || u.batchId})`)
                    .join(", ");
            }
            if (json.warnings && json.warnings.length) {
                successMsg += " Warnings: " + json.warnings.map(w => w.reason).join("; ");
            }

            setMessage({ type: "success", text: successMsg });
            // reset form
            setPatientName("");
            setItems([{ name: "", quantity: 1, unitPrice: 0.0, description: "" }]);
            setInvoiceTotal(0);
            fetchRecentInvoices();
        } catch (err) {
            console.error("Create invoice error:", err);
            setMessage({ type: "error", text: "Network/server error creating invoice." });
        }
    }

    async function viewInvoice(id) {
        try {
            const res = await fetch(`${API_BASE}/api/billing/${id}`, {
                headers: { "Content-Type": "application/json", ...authHeader() },
            });
            if (!res.ok) throw new Error(`Failed to load invoice (${res.status})`);
            const json = await res.json();
            setModalInvoice(json);
        } catch (err) {
            console.error("View invoice error:", err);
            setMessage({ type: "error", text: "Failed to load invoice details." });
        }
    }

    function closeModal() {
        setModalInvoice(null);
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Billing & Invoicing</h1>

            <div className="bg-white p-6 rounded shadow-sm">
                <form onSubmit={createInvoice}>
                    <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-9">
                            <input
                                className="w-full border rounded px-4 py-3"
                                placeholder="Patient name (optional)"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                            />
                        </div>
                        <div className="col-span-3">
                            <select className="w-full border rounded px-3 py-3" value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option>Paid</option>
                                <option>Pending</option>
                                <option>Cancelled</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="font-semibold mb-2">Items</h3>
                        {items.map((it, i) => (
                            <div key={i} className="grid grid-cols-12 gap-3 items-center mb-3 relative">
                                <div className="col-span-6">
                                    <input
                                        type="text"
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="Medicine name"
                                        value={it.name}
                                        onChange={(e) => handleNameInputChange(i, e.target.value)}
                                        onBlur={() => setTimeout(() => setSuggestions(s => ({ ...s, [i]: [] })), 120)}
                                    />
                                    {/* suggestions dropdown */}
                                    {suggestions[i] && suggestions[i].length > 0 && (
                                        <ul
                                            className="absolute left-0 top-full z-50 mt-1 bg-white border rounded shadow w-5/6 max-h-48 overflow-auto"
                                            ref={(el) => (suggestionsRef.current[i] = el)}
                                        >
                                            {suggestions[i].map((m) => (
                                                <li
                                                    key={m._id}
                                                    className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                                                    onMouseDown={(ev) => { ev.preventDefault(); selectSuggestion(i, m); }}
                                                >
                                                    {m.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border rounded px-3 py-2 text-right"
                                        placeholder="Qty"
                                        value={it.quantity}
                                        onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full border rounded px-3 py-2 text-right"
                                        placeholder="Unit price"
                                        value={it.unitPrice}
                                        onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                                    />
                                </div>

                                <div className="col-span-2 text-right">
                                    <button type="button" className="text-red-500" onClick={() => removeItem(i)}>Remove</button>
                                </div>

                                <div className="col-span-12">
                                    <input
                                        type="text"
                                        className="w-full border rounded px-3 py-2 mt-1"
                                        placeholder="Description (optional)"
                                        value={it.description}
                                        onChange={(e) => updateItem(i, "description", e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}

                        <div>
                            <button type="button" className="text-indigo-600 underline text-sm mb-3" onClick={addItem}>+ Add item</button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded shadow">Create Invoice</button>
                                {message && message.type === "success" && (
                                    <div className="mt-2 text-green-600">{message.text}</div>
                                )}
                                {message && message.type === "error" && (
                                    <div className="mt-2 text-red-600">{message.text}</div>
                                )}
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-gray-500">Invoice Total</div>
                                <div className="text-2xl font-bold">{invoiceTotal.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Recent invoices */}
            <div className="bg-white p-6 rounded shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Recent Invoices</h3>
                    <button className="text-indigo-600" onClick={fetchRecentInvoices}>Refresh</button>
                </div>

                <table className="min-w-full">
                    <thead className="text-left text-sm text-gray-600">
                        <tr>
                            <th className="py-2">#</th>
                            <th className="py-2">Patient</th>
                            <th className="py-2">Total</th>
                            <th className="py-2">Status</th>
                            <th className="py-2">Created</th>
                            <th className="py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.map((inv, idx) => (
                            <tr key={inv._id} className="border-t">
                                <td className="py-3">{idx + 1}</td>
                                <td className="py-3">{inv.patientName || "N/A"}</td>
                                <td className="py-3">{Number(inv.totalAmount || 0).toFixed(2)}</td>
                                <td className="py-3">{inv.status}</td>
                                <td className="py-3">{formatDate(inv.createdAt)}</td>
                                <td className="py-3"><button className="text-indigo-600" onClick={() => viewInvoice(inv._id)}>View</button></td>
                            </tr>
                        ))}
                        {recent.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-gray-400">No invoices yet</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Invoice modal */}
            {modalInvoice && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40">
                    <div className="bg-white w-full max-w-6xl rounded shadow-lg p-6 relative">
                        <div className="flex justify-between items-start">
                            <h2 className="text-2xl font-bold">Invoice #{modalInvoice.invoiceNumber || modalInvoice._id}</h2>
                            <button className="text-gray-600" onClick={closeModal}>Close</button>
                        </div>

                        <div className="mt-4">
                            <div><strong>Patient:</strong> {modalInvoice.patientName || "N/A"}</div>
                            <div className="mt-6">
                                <table className="w-full">
                                    <thead className="text-left text-sm text-gray-600">
                                        <tr>
                                            <th className="py-2">Item</th>
                                            <th className="py-2">Qty</th>
                                            <th className="py-2">Unit</th>
                                            <th className="py-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(modalInvoice.items || []).map((it, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="py-3">{it.name || it.description || "Item"}</td>
                                                <td className="py-3">{it.quantity}</td>
                                                <td className="py-3">{Number(it.unitPrice || 0).toFixed(2)}</td>
                                                <td className="py-3">{(Number(it.quantity || 0) * Number(it.unitPrice || 0)).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {(modalInvoice.items || []).length === 0 && <tr><td colSpan="4" className="py-8 text-center text-gray-400">No items</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-right mt-6">
                                <div className="text-sm text-gray-500">Total</div>
                                <div className="text-3xl font-bold">{Number(modalInvoice.totalAmount || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingPage;