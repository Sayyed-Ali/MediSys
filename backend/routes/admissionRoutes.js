// backend/routes/admissionRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const mongoose = require('mongoose');
const axios = require('axios');

// Patient Admission model (kept inline so script is self-contained)
const admissionSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    age: Number,
    gender: String,
    roomType: {
        type: String,
        enum: ['General', 'Semi-Private', 'Private', 'ICU'],
        required: true,
    },
    doctor: String,
    admittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['Admitted', 'Discharged'], default: 'Admitted' }
}, { timestamps: true });

const Admission = mongoose.models.Admission || mongoose.model('Admission', admissionSchema);

// Analytics service base URL (defaults to local analytics service)
const ANALYTICS_BASE = process.env.ANALYTICS_URL || process.env.INVOICE_ANALYTICS_URL ||
    (process.env.INVOICE_SERVICE_URL ? process.env.INVOICE_SERVICE_URL.replace('/api/invoice/parse', '') : 'http://127.0.0.1:5001');

async function postAdmissionEvent(payload) {
    try {
        const url = `${ANALYTICS_BASE.replace(/\/$/, '')}/api/analytics/update`;
        // keep it short so it doesn't hang your request
        await axios.post(url, payload, { timeout: 5000 });
        console.log('[admissions] Posted analytics event:', payload.type || 'admission');
    } catch (err) {
        console.warn('[admissions] Analytics update failed (non-fatal):', err && err.message ? err.message : err);
    }
}

// POST /api/admissions
router.post('/', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const admission = new Admission(req.body);
        await admission.save();

        // send analytics event (non-blocking)
        const payload = {
            type: 'admission',
            patientName: admission.patientName,
            age: admission.age,
            gender: admission.gender,
            roomType: admission.roomType,
            doctor: admission.doctor,
            admittedAt: admission.admittedAt ? admission.admittedAt.toISOString() : new Date().toISOString(),
            admissionId: admission._id.toString()
        };
        // fire and forget but await internally to log failures
        postAdmissionEvent(payload).catch(() => { /* already logged in helper */ });

        res.status(201).json({ msg: 'Patient admitted successfully', admission });
    } catch (err) {
        console.error('Admission error:', err && err.message ? err.message : err);
        if (err && err.errors) console.error('Validation errors:', err.errors);
        res.status(500).json({ error: 'Failed to admit patient' });
    }
});

// GET /api/admissions
router.get('/', auth, checkRole(['Admin', 'Staff', 'Nurse', 'Doctor']), async (req, res) => {
    try {
        const admissions = await Admission.find().sort({ admittedAt: -1 }).lean();
        res.json(admissions);
    } catch (err) {
        console.error('Get admissions error:', err && err.message ? err.message : err);
        res.status(500).json({ error: 'Failed to fetch admissions' });
    }
});

// PATCH /api/admissions/:id/room
router.patch('/:id/room', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        console.log('[admissions] PATCH /:id/room called, params:', req.params);
        console.log('[admissions] headers auth:', {
            'x-auth-token': req.header('x-auth-token'),
            Authorization: req.header('authorization')
        });
        console.log('[admissions] req.user:', req.user);
        console.log('[admissions] body:', req.body);

        const { roomType } = req.body;
        if (!roomType) return res.status(400).json({ error: 'roomType is required' });

        const allowed = ['General', 'Semi-Private', 'Private', 'ICU'];
        if (!allowed.includes(roomType)) return res.status(400).json({ error: 'Invalid roomType' });

        const updated = await Admission.findByIdAndUpdate(
            req.params.id,
            { roomType },
            { new: true, runValidators: true }
        );

        if (!updated) {
            console.warn('[admissions] Admission not found for id:', req.params.id);
            return res.status(404).json({ error: 'Admission not found' });
        }

        // send analytics event about room change (non-blocking)
        const payload = {
            type: 'admission',
            patientName: updated.patientName,
            age: updated.age,
            gender: updated.gender,
            roomType: updated.roomType,
            doctor: updated.doctor,
            admittedAt: updated.admittedAt ? updated.admittedAt.toISOString() : '',
            admissionId: updated._id.toString()
        };
        postAdmissionEvent(payload).catch(() => { /* logged in helper */ });

        console.log('[admissions] Room updated ok for id:', req.params.id);
        res.json({ msg: 'Room updated successfully', admission: updated });
    } catch (err) {
        console.error('Admission room update error:', err && err.message ? err.message : err);
        if (err && err.errors) console.error('Validation errors:', err.errors);
        return res.status(500).json({ error: 'Failed to update room' });
    }
});

module.exports = router;