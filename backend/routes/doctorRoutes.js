const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   POST /api/doctors
// @desc    Create a new doctor record
// @access  Private (Admin only)
router.post('/', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const newDoctor = new Doctor(req.body);
        await newDoctor.save();
        res.status(201).json(newDoctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/doctors
// @desc    Get all doctor records
// @access  Private (All roles except Patient)
router.get('/', auth, checkRole(['Admin', 'Staff', 'Doctor', 'Nurse']), async (req, res) => {
    try {
        const doctors = await Doctor.find().populate('user');
        res.status(200).json(doctors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/doctors/:id
// @desc    Get a single doctor by ID
// @access  Private (All roles except Patient)
router.get('/:id', auth, checkRole(['Admin', 'Staff', 'Doctor', 'Nurse']), async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).populate('user');
        if (!doctor) {
            return res.status(404).json({ msg: 'Doctor not found' });
        }
        res.status(200).json(doctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;