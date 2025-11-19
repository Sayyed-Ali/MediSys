const mongoose = require('mongoose');
const { Schema } = mongoose;

const invoiceReviewSchema = new Schema({
    description: { type: String, required: true },
    batch: String,
    expiry: String,
    quantity: Number,
    price: Number,
    raw: { type: Array },
    candidateMatches: [{
        medicine: { type: Schema.Types.ObjectId, ref: 'Medicine' },
        rating: Number
    }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InvoiceReview', invoiceReviewSchema);