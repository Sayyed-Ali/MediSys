// backend/models/Payment.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
    invoice: { type: Schema.Types.ObjectId, ref: 'Billing', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['Cash', 'Card', 'BankTransfer', 'Insurance', 'Other'], default: 'Cash' },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reference: { type: String },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);