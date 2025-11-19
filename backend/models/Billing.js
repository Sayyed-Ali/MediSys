// backend/models/Billing.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LineItemSchema = new Schema({
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: false },
    description: { type: String, required: true }, // fallback if medicine ref not present
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const BillingSchema = new Schema({
    invoiceNumber: { type: String, trim: true, index: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: false },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: false },
    billedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lineItems: { type: [LineItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Draft', 'Issued', 'Paid', 'Cancelled'], default: 'Draft' },
    notes: { type: String, default: '' },
    paidAmount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

// Pre-save hook to compute amounts if not provided
BillingSchema.pre('save', function (next) {
    try {
        let subtotal = 0;
        for (const li of this.lineItems || []) {
            // ensure amount = qty * rate (if amount missing or inconsistent, recalc)
            li.amount = Number((li.qty || 0) * (li.rate || 0));
            subtotal += li.amount;
        }
        this.subtotal = Number(subtotal);
        this.total = Number((this.subtotal || 0) + (this.tax || 0));
        if (this.paidAmount == null) this.paidAmount = 0;
        next();
    } catch (err) { next(err); }
});

module.exports = mongoose.model('Billing', BillingSchema);