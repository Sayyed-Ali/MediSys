const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SupplierSchema = new Schema({
    name: { type: String, required: true },
    contactPerson: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    address: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', SupplierSchema);