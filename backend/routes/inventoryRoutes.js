const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const multer = require('multer'); // <-- Ensure this is correctly imported
const axios = require('axios');
const FormData = require('form-data');
const { Types } = require('mongoose');

// Use memory storage for Multer since the file will be immediately forwarded
const upload = multer({ storage: multer.memoryStorage() });

// @route   POST /api/inventory/ocr-intake
// @desc    Upload medicine label, process with OCR, and add to inventory
// @access  Private (Admin, Staff only)
router.post('/ocr-intake', auth, checkRole(['Admin', 'Staff']), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No image file uploaded.' });
        }

        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        // Send the image to the OCR service
        const ocrServiceUrl = 'http://localhost:3001/api/ocr';
        const ocrResponse = await axios.post(ocrServiceUrl, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        const { batchNumber, expiryDate } = ocrResponse.data;
        if (!batchNumber || !expiryDate) {
            return res.status(400).json({ msg: 'OCR failed to extract required information.' });
        }

        // Hardcoded values for demonstration. In a real app, you would
        // get these from the request body or a lookup.
        // NOTE: These IDs must be valid MongoDB ObjectIds in your test data!
        const medicineId = new Types.ObjectId('60c72b2f9b1d8e0015a9a5f1');
        const supplierId = new Types.ObjectId('60c72b2f9b1d8e0015a9a5f2');
        const quantity = 50;

        const newInventoryItem = new Inventory({
            medicine: medicineId,
            batchNumber: batchNumber,
            expiryDate: new Date(expiryDate),
            quantity: quantity,
            supplier: supplierId,
        });

        await newInventoryItem.save();
        res.status(201).json({
            msg: 'Inventory item added successfully via OCR.',
            item: newInventoryItem
        });

    } catch (err) {
        console.error('OCR integration error:', err);
        // Log detailed error from axios if available
        if (err.response) {
            console.error('OCR Service Response Error:', err.response.data);
        }
        res.status(500).json({ error: err.message || 'Server Error during OCR processing.' });
    }
});

// --- Existing Inventory Routes (Re-checked) ---

// @route   POST /api/inventory
// @desc    Add a new batch of medicine to inventory
// @access  Private (Admin, Staff only)
router.post('/', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const newBatch = new Inventory(req.body);
        await newBatch.save();
        res.status(201).json(newBatch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private (Admin, Staff, Nurse only)
router.get('/', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const inventory = await Inventory.find().populate('medicine').populate('supplier');
        res.status(200).json(inventory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   PUT /api/inventory/:id
// @desc    Update the quantity of an inventory batch
// @access  Private (Admin, Staff, Nurse only)
router.put('/:id', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const { quantity } = req.body;
        const updatedInventory = await Inventory.findByIdAndUpdate(
            req.params.id,
            { quantity },
            { new: true, runValidators: true }
        );
        if (!updatedInventory) return res.status(404).json({ msg: 'Inventory item not found' });
        res.status(200).json(updatedInventory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
