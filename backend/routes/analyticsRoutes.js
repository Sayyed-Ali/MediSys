// backend/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { postToAnalytics } = require('../services/analyticsClient');

const BASE = process.env.ANALYTICS_SERVICE_URL || 'http://127.0.0.1:5001/api';

// POST /api/analytics/demand
router.post('/demand', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const { month } = req.body;
        if (!month) return res.status(400).json({ msg: 'Month parameter is required' });

        const data = await postToAnalytics('/predict/demand', { month });
        return res.status(200).json(data);
    } catch (err) {
        console.error('Analytics /demand error:', err && err.message ? err.message : err);
        return res.status(500).json({ msg: 'Analytics service error', details: (err && err.original) ? (err.original.response?.data || err.original.message) : err.message });
    }
});

// POST /api/analytics/risk
router.post('/risk', auth, checkRole(['Admin', 'Doctor']), async (req, res) => {
    try {
        const payload = req.body || {};
        const data = await postToAnalytics('/predict/risk', payload);
        return res.status(200).json(data);
    } catch (err) {
        console.error('Analytics /risk error:', err && err.message ? err.message : err);
        return res.status(500).json({ msg: 'Analytics service error', details: (err && err.original) ? (err.original.response?.data || err.original.message) : err.message });
    }
});

module.exports = router;