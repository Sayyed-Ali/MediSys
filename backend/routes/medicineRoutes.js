const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   POST /api/medicines
// @desc    Add a new medicine to the master list
// @access  Private (Admin, Staff only)
router.post('/', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const newMedicine = new Medicine(req.body);
        await newMedicine.save();
        res.status(201).json(newMedicine);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/medicines
// @desc    Get all medicines
// @access  Private (All roles except Patient)
router.get('/', auth, checkRole(['Admin', 'Staff', 'Doctor', 'Nurse']), async (req, res) => {
    try {
        const medicines = await Medicine.find();
        res.status(200).json(medicines);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/medicines/:id
// @desc    Get a single medicine by ID
// @access  Private (All roles except Patient)
router.get('/:id', auth, checkRole(['Admin', 'Staff', 'Doctor', 'Nurse']), async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) return res.status(404).json({ msg: 'Medicine not found' });
        res.status(200).json(medicine);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;