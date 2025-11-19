const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const User = require('../models/User'); // Import User model
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const mongoose = require('mongoose'); // For transactions (optional here, but good practice)

// --- Patient Registration Endpoint ---
// This handles creating a User (login) AND a linked Patient profile.
router.post('/register', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { firstName, lastName, email, password, dateOfBirth, contactNumber, address } = req.body;

        // 1. Create the base User account (Role is set to 'Patient' in the model's logic or here)
        const newUser = new User({
            firstName,
            lastName,
            email,
            password,
            role: 'Patient' // Explicitly set role
        });
        await newUser.save({ session }); // Use session for atomicity

        // 2. Create the linked Patient profile
        const newPatient = new Patient({
            user: newUser._id, // Link the new User's ID
            dateOfBirth,
            contactNumber,
            address,
            isAdmitted: false // Default status
        });
        await newPatient.save({ session });

        // 3. Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            msg: 'Patient and User registered successfully.',
            user: newUser,
            patient: newPatient
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        if (err.code === 11000) { // MongoDB duplicate key error (Email already exists)
            return res.status(409).json({ msg: 'Registration failed. Email already exists.' });
        }
        console.error("Patient Registration Error:", err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});
// ------------------------------------


// @route   POST /api/patients
// @desc    Create a new patient profile (Protected, usually used by staff)
// @access  Private (Admin, Staff, or Doctor only)
router.post('/', auth, checkRole(['Admin', 'Staff', 'Doctor']), async (req, res) => {
    try {
        const newPatient = new Patient(req.body);
        await newPatient.save();
        res.status(201).json(newPatient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/patients
// @desc    Get all patient records (Protected)
// @access  Private (Admin, Staff, or Doctor only)
router.get('/', auth, checkRole(['Admin', 'Staff', 'Doctor']), async (req, res) => {
    try {
        // Find all patients and populate the core user details
        const patients = await Patient.find().populate('user', 'firstName lastName email');
        res.status(200).json(patients);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/patients/:id
// @desc    Get a patient record by ID
// @access  Private (Admin, Staff, or Doctor only)
router.get('/:id', auth, checkRole(['Admin', 'Staff', 'Doctor']), async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).populate('user', 'firstName lastName email');
        if (!patient) return res.status(404).json({ msg: 'Patient not found' });
        res.status(200).json(patient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
