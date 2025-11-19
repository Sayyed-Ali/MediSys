// src/api/api.js
import authHeader from '../utils/authHeader';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

export async function getBeds() {
    const res = await fetch(`${API_BASE}/api/beds`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        // don't use credentials unless backend uses cookies; most token auth doesn't need this
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.msg || `Failed to load beds (${res.status})`);
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return res.json();
}

export async function getInventory() {
    const res = await fetch(`${API_BASE}/api/inventory`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.msg || `Failed to load inventory (${res.status})`);
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return res.json();
}