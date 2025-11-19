// backend/services/analyticsClient.js
const axios = require('axios');

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://127.0.0.1:5001';

async function postToAnalytics(path, payload, opts = {}) {
    const url = `${ANALYTICS_SERVICE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    try {
        const resp = await axios.post(url, payload, {
            timeout: opts.timeout || 120000,
            headers: opts.headers || { 'Content-Type': 'application/json' },
            validateStatus: () => true
        });
        if (resp.status >= 200 && resp.status < 300) return resp.data;
        const err = new Error('Analytics service returned non-200');
        err.status = resp.status;
        err.data = resp.data;
        throw err;
    } catch (err) {
        // normalize error
        const e = new Error(`Analytics call failed: ${err.message}`);
        e.original = err;
        throw e;
    }
}

module.exports = { postToAnalytics };