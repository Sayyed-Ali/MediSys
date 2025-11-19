import authHeader from '../utils/authHeader';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function getAdmissions() {
    const res = await fetch(`${API_BASE}/api/admissions`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) throw new Error('Failed to fetch admissions');
    return res.json();
}

export async function admitPatient(data) {
    const res = await fetch(`${API_BASE}/api/admissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to admit patient');
    return res.json();
}

export async function updateRoom(admissionId, roomType) {
    const res = await fetch(`${API_BASE}/api/admissions/${admissionId}/room`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ roomType }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw json;
    return json;
}

export async function listAdmissions() {
    const res = await fetch(`${API_BASE}/api/admissions`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) throw new Error('Failed to load admissions');
    return res.json();
}