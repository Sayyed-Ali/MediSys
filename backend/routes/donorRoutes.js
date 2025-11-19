const express = require('express');
const router = express.Router();
const Donor = require('../models/Donor');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   POST /api/donors
// @desc    Register a new donor
// @access  Private (Admin, Staff, Patient)
router.post('/', auth, checkRole(['Admin', 'Staff', 'Patient']), async (req, res) => {
    try {
        const newDonor = new Donor(req.body);
        await newDonor.save();
        res.status(201).json(newDonor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/donors
// @desc    Get all donors (for staff/admin)
// @access  Private (Admin, Staff, Nurse only)
router.get('/', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const donors = await Donor.find().populate('user');
        res.status(200).json(donors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/donors/compatible/:bloodGroup
// @desc    Find compatible donors for a given blood group
// @access  Private (Admin, Staff, Nurse only)
router.get('/compatible/:bloodGroup', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    const { bloodGroup } = req.params;

    // Blood group compatibility logic
    const compatibleGroups = {
        'A+': ['A+', 'A-', 'O+', 'O-'],
        'A-': ['A-', 'O-'],
        'B+': ['B+', 'B-', 'O+', 'O-'],
        'B-': ['B-', 'O-'],
        'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        'AB-': ['A-', 'B-', 'AB-', 'O-'],
        'O+': ['O+', 'O-'],
        'O-': ['O-']
    };

    try {
        const compatibleDonors = await Donor.find({
            bloodGroup: { $in: compatibleGroups[bloodGroup] }
        }).populate('user');

        res.status(200).json(compatibleDonors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;