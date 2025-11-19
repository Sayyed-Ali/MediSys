import authHeader from '../utils/authHeader';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function uploadInvoice(file, supplierId, onProgress) {
    const form = new FormData();
    form.append('invoice', file);
    if (supplierId) form.append('supplierId', supplierId);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/invoice/upload`, true);

        const headers = authHeader();
        Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

        xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && typeof onProgress === 'function') {
                onProgress(Math.round((evt.loaded / evt.total) * 100));
            }
        };

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                try {
                    const resJson = JSON.parse(xhr.responseText || '{}');
                    if (xhr.status >= 200 && xhr.status < 300) resolve(resJson);
                    else reject({ status: xhr.status, body: resJson });
                } catch (err) {
                    reject(err);
                }
            }
        };

        xhr.onerror = () => reject(new Error('Network error during invoice upload.'));
        xhr.send(form);
    });
}

export async function listSuppliers() {
    const res = await fetch(`${API_BASE}/api/suppliers`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) throw new Error(`Failed to load suppliers (${res.status})`);
    return res.json();
}

export async function createInventory(inventoryObj) {
    const res = await fetch(`${API_BASE}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(inventoryObj),
    });
    const json = await res.json();
    if (!res.ok) throw json;
    return json;
}

export async function listMedicines() {
    const res = await fetch(`${API_BASE}/api/medicines`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
    });
    if (!res.ok) throw new Error('Failed to load medicines');
    return res.json();
}