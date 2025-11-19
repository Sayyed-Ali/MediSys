const express = require('express');
const router = express.Router();
const Bed = require('../models/Bed');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   POST /api/beds
// @desc    Add a new bed to the system
// @access  Private (Admin only)
router.post('/', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const newBed = new Bed(req.body);
        await newBed.save();
        res.status(201).json(newBed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/beds
// @desc    Get all beds
// @access  Private (Admin, Staff, Nurse)
router.get('/', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const beds = await Bed.find(query);
        res.status(200).json(beds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   PUT /api/beds/:id
// @desc    Update a bed's status
// @access  Private (Admin, Staff, Nurse)
router.put('/:id', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const { status } = req.body;
        const updatedBed = await Bed.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );
        if (!updatedBed) return res.status(404).json({ msg: 'Bed not found' });
        res.status(200).json(updatedBed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;