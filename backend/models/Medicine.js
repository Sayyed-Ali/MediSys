const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MedicineSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    brand: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    category: {
        type: String // e.g., 'Antibiotic', 'Painkiller', 'Antihistamine'
    }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', MedicineSchema);