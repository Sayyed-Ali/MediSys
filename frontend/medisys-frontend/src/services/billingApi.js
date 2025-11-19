// src/services/billingApi.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * List invoices with optional limit & skip
 */
export async function listInvoices({ limit = 50, skip = 0 } = {}) {
    const url = `${API_BASE}/api/billing?limit=${limit}&skip=${skip}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load invoices' }));
        throw err;
    }
    return res.json();
}

/**
 * Get invoice by id
 */
export async function getInvoice(id) {
    const res = await fetch(`${API_BASE}/api/billing/${id}`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load invoice' }));
        throw err;
    }
    return res.json();
}

/**
 * Create an invoice
 * payload should follow backend schema: { patientName, items: [...], total, paymentStatus, ... }
 */
export async function createInvoice(payload) {
    const res = await fetch(`${API_BASE}/api/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw json;
    return json;
}