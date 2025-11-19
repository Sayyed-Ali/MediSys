// backend/routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Billing = require('../models/Billing');
const Inventory = require('../models/Inventory');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

function escapeRegExp(string = '') {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function genInvoiceNumber() {
    const t = Date.now();
    const r = Math.floor(Math.random() * 9000) + 1000;
    return `INV-${t}-${r}`;
}

// Allowed statuses in Billing model — adjust if your schema is different
const ALLOWED_STATUSES = ['Paid', 'Unpaid', 'Cancelled', 'Refunded'];

/**
 * Normalize incoming items to an array of objects with
 * { description, qty, rate } which the Billing model expects.
 *
 * Accepts multiple input shapes:
 *  - { lineItems: [{ description, qty, rate }] }
 *  - { items: [{ name/description, quantity/qty, price/rate }] }
 *  - older forms with { product, qtyOrdered, unitPrice } etc.
 */
function normalizeToLineItems(payload) {
    const arr = Array.isArray(payload.lineItems)
        ? payload.lineItems
        : (Array.isArray(payload.items) ? payload.items : []);

    const normalized = arr.map(it => {
        const description = (it.description || it.name || it.product || it.label || '').toString().trim();
        const qty = Number(it.qty ?? it.quantity ?? it.qtyOrdered ?? it.quantityOrdered ?? 0);
        const rate = Number(it.rate ?? it.price ?? it.unitPrice ?? it.pricePerUnit ?? 0);
        const amount = Number((isNaN(qty) || isNaN(rate)) ? 0 : (qty * rate).toFixed(2));
        return {
            description,
            qty: qty > 0 ? qty : 0,
            rate: isNaN(rate) ? 0 : rate,
            amount
        };
    }).filter(x => x.description && x.qty > 0);

    return normalized;
}

/**
 * POST /api/billing
 * Create billing document and decrement inventory in a transaction.
 */
router.post('/', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const payload = req.body || {};
        const lineItems = normalizeToLineItems(payload);

        if (!lineItems.length) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ msg: 'Invoice must contain at least one valid line item' });
        }

        // compute subtotal/tax/total
        let subtotal = 0;
        for (const li of lineItems) subtotal += Number(li.amount || (li.qty * li.rate) || 0);
        subtotal = Number(subtotal.toFixed(2));
        const tax = payload.tax !== undefined ? Number(payload.tax) : 0;
        const total = Number((subtotal + (isNaN(tax) ? 0 : tax)).toFixed(2));
        const paidAmount = payload.paidAmount !== undefined ? Number(payload.paidAmount) : 0;

        const requestedStatus = (payload.status || '').toString();
        const status = ALLOWED_STATUSES.includes(requestedStatus) ? requestedStatus : 'Unpaid';

        const invoiceNumber = genInvoiceNumber();
        const billedBy = req.user?.id || req.user?._id || null;

        // inventory operations + warnings
        const inventoryUpdates = [];
        const warnings = [];

        // decrement inventory per line item (FIFO by expiry then createdAt)
        for (const li of lineItems) {
            let remaining = Number(li.qty || 0);
            if (remaining <= 0) continue;

            // try find medicine by exact name
            const name = li.description;
            let med = await Medicine.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(name)}$`, 'i') } }).session(session);

            // fallback: look through inventory medicine names
            if (!med) {
                const invWithName = await Inventory.findOne({}).populate({
                    path: 'medicine',
                    match: { name: { $regex: new RegExp(escapeRegExp(name), 'i') } }
                }).session(session);
                if (invWithName && invWithName.medicine) med = invWithName.medicine;
            }

            if (!med) {
                warnings.push({ item: li, reason: `No medicine master record found for "${name}" — inventory not decremented.` });
                continue;
            }

            const batches = await Inventory.find({
                medicine: med._id,
                quantity: { $gt: 0 }
            }).sort({ expiryDate: 1, createdAt: 1 }).session(session);

            for (const b of batches) {
                if (remaining <= 0) break;
                const take = Math.min(remaining, b.quantity);
                const updated = await Inventory.findOneAndUpdate(
                    { _id: b._id, quantity: { $gte: take } },
                    { $inc: { quantity: -take } },
                    { new: true, session }
                );
                if (updated) {
                    inventoryUpdates.push({
                        itemDescription: li.description,
                        batchId: b._id,
                        batchNumber: b.batchNumber,
                        taken: take,
                        remainingQtyInBatch: updated.quantity
                    });
                    remaining -= take;
                }
            }

            if (remaining > 0) {
                warnings.push({ item: li, reason: `Insufficient inventory for "${name}". Short by ${remaining}.` });
            }
        } // end lineItems loop

        // Build billing document matching your Billing model
        const newBill = new Billing({
            invoiceNumber,
            billedBy,
            patientName: payload.patientName || payload.patient || 'Walk-in',
            subtotal,
            tax,
            total,
            paidAmount,
            status,
            notes: payload.notes || '',
            lineItems
        });

        await newBill.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ msg: 'Invoice created', invoice: newBill, inventoryUpdates, warnings });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('[billingRoutes] Error creating invoice:', err && err.message ? err.message : err);
        return res.status(500).json({ error: err.message || 'Server error creating invoice' });
    }
});

/**
 * GET /api/billing - list invoices (Admin/Staff)
 */
router.get('/', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const list = await Billing.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('billedBy', 'firstName email role')
            .lean();
        res.json(list);
    } catch (err) {
        console.error('[billingRoutes] List error:', err);
        res.status(500).json({ error: 'Server error listing invoices' });
    }
});

/**
 * GET /api/billing/:id
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const invoice = await Billing.findById(req.params.id)
            .populate('billedBy', 'firstName email role')
            .populate('patient');
        if (!invoice) return res.status(404).json({ msg: 'Invoice not found' });
        if (req.user.role === 'Patient' && invoice.patient && String(invoice.patient.user) !== String(req.user.id)) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/billing/:id/status
 */
router.put('/:id/status', auth, checkRole(['Admin', 'Staff']), async (req, res) => {
    try {
        const { status } = req.body;
        const newStatus = ALLOWED_STATUSES.includes(status) ? status : 'Unpaid';
        const updated = await Billing.findByIdAndUpdate(req.params.id, { status: newStatus }, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ msg: 'Invoice not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;