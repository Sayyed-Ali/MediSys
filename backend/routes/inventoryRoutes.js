// backend/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { Types } = require('mongoose');

const upload = multer({ storage: multer.memoryStorage() });

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://localhost:3001/api/ocr';

// POST /api/inventory/ocr-intake
router.post('/ocr-intake', auth, checkRole(['Admin', 'Staff']), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ msg: 'No image file uploaded.' });

        const formData = new FormData();
        formData.append('image', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });

        console.log('[inventoryRoutes] POST to OCR service:', OCR_SERVICE_URL);

        const ocrResponse = await axios.post(OCR_SERVICE_URL, formData, {
            headers: { ...formData.getHeaders() },
            timeout: 120000,
            validateStatus: () => true
        });

        console.log('[inventoryRoutes] OCR response status:', ocrResponse.status);
        if (ocrResponse.status !== 200) {
            console.error('[inventoryRoutes] OCR service error body:', ocrResponse.data);
            return res.status(502).json({ error: `OCR service returned ${ocrResponse.status}`, details: ocrResponse.data });
        }

        const { batchNumber, expiryDate } = ocrResponse.data;
        if (!batchNumber || !expiryDate) {
            return res.status(400).json({ msg: 'OCR failed to extract required information.', raw: ocrResponse.data });
        }

        // Hardcoded demo IDs — ensure these exist in your DB
        const medicineId = new Types.ObjectId('60c72b2f9b1d8e0015a9a5f1');
        const supplierId = new Types.ObjectId('60c72b2f9b1d8e0015a9a5f2');
        const quantity = 50;

        const newInventoryItem = new Inventory({
            medicine: medicineId,
            batchNumber: batchNumber,
            expiryDate: new Date(expiryDate),
            quantity,
            supplier: supplierId,
        });

        await newInventoryItem.save();
        res.status(201).json({ msg: 'Inventory item added via OCR', item: newInventoryItem });

    } catch (err) {
        console.error('OCR integration error:', err && err.message ? err.message : err);
        if (err.response) {
            console.error('OCR Service Response Error:', err.response.status, err.response.data);
            return res.status(502).json({ error: `OCR service error ${err.response.status}`, details: err.response.data });
        }
        return res.status(500).json({ error: err.message || 'Server Error during OCR processing.' });
    }
});

// ... rest of your existing inventory routes (unchanged)
router.post('/', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const newBatch = new Inventory(req.body);
        await newBatch.save();
        res.status(201).json(newBatch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const inventory = await Inventory.find().populate('medicine').populate('supplier');
        res.status(200).json(inventory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', auth, checkRole(['Admin', 'Staff', 'Nurse']), async (req, res) => {
    try {
        const { quantity } = req.body;
        const updatedInventory = await Inventory.findByIdAndUpdate(req.params.id, { quantity }, { new: true, runValidators: true });
        if (!updatedInventory) return res.status(404).json({ msg: 'Inventory item not found' });
        res.status(200).json(updatedInventory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;