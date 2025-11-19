import authHeader from '../utils/authHeader';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function createInvoice(invoice) {
    const res = await fetch(`${API_BASE}/api/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(invoice),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
}

export async function getInvoice(id) {
    const res = await fetch(`${API_BASE}/api/billing/${id}`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) throw new Error('Invoice fetch failed');
    return res.json();
}