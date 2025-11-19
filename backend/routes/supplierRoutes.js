const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   POST /api/suppliers
// @desc    Add a new supplier
// @access  Private (Admin, Staff only)
router.post('/', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const newSupplier = new Supplier(req.body);
        await newSupplier.save();
        res.status(201).json(newSupplier);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/suppliers
// @desc    Get all suppliers
// @access  Private (Admin, Staff only)
router.get('/', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const suppliers = await Supplier.find();
        res.status(200).json(suppliers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/suppliers/:id
// @desc    Get a single supplier by ID
// @access  Private (Admin, Staff only)
router.get('/:id', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ msg: 'Supplier not found' });
        }
        res.status(200).json(supplier);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   PUT /api/suppliers/:id
// @desc    Update a supplier's information
// @access  Private (Admin, Staff only)
router.put('/:id', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const updatedSupplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedSupplier) {
            return res.status(404).json({ msg: 'Supplier not found' });
        }
        res.status(200).json(updatedSupplier);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/suppliers/:id
// @desc    Delete a supplier
// @access  Private (Admin only)
router.delete('/:id', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const deletedSupplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!deletedSupplier) {
            return res.status(404).json({ msg: 'Supplier not found' });
        }
        res.status(200).json({ msg: 'Supplier deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;