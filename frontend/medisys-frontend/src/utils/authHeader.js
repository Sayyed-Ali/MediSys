// src/utils/authHeader.js
export default function authHeader() {
    try {
        // prefer canonical key ms_token, fall back to legacy token
        const raw = localStorage.getItem('ms_token') || localStorage.getItem('token') || null;
        if (!raw) return {};
        const hasBearer = /^Bearer\s+/i.test(raw);
        const bearerValue = hasBearer ? raw : `Bearer ${raw}`;
        const bareToken = hasBearer ? raw.replace(/^Bearer\s+/i, '') : raw;
        return {
            Authorization: bearerValue,
            'x-auth-token': bareToken,
        };
    } catch (e) {
        return {};
    }
}