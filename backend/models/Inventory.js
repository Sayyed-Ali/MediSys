const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InventorySchema = new Schema({
    medicine: {
        type: Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    batchNumber: {
        type: String,
        required: true
    },
    expiryDate: {
        type: Date,
        required: false  // make optional, we'll validate before writing
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier', // optional now to allow invoice imports without supplier
        required: false
    },
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);