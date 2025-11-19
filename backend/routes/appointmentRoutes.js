const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Private (Admin, Staff, or Patient)
router.post('/', auth, checkRole(['Admin', 'Staff', 'Patient']), async (req, res) => {
    try {
        const newAppointment = new Appointment(req.body);
        await newAppointment.save();
        res.status(201).json(newAppointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/appointments
// @desc    Get all appointments (Admin, Staff, Doctor, Nurse) or only own appointments (Patient)
// @access  Private (All roles)
router.get('/', auth, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'Patient') {
            // Find appointments for the logged-in patient
            query = { patient: req.user.id };
        }

        const appointments = await Appointment.find(query)
            .populate('patient')
            .populate('doctor');
        res.status(200).json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/appointments/:id
// @desc    Get a single appointment by ID
// @access  Private (All roles)
router.get('/:id', auth, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patient')
            .populate('doctor');

        if (!appointment) {
            return res.status(404).json({ msg: 'Appointment not found' });
        }

        // Check if the user is authorized to view this appointment
        if (req.user.role === 'Patient' && appointment.patient.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied: You can only view your own appointments' });
        }

        res.status(200).json(appointment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;