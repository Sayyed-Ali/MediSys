const mongoose = require('mongoose'); // <-- CORRECTED: was accidentally 'e'
const Schema = mongoose.Schema;

const BedSchema = new Schema({
    bedNumber: {
        type: String,
        required: true,
        unique: true
    },
    ward: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Available', 'Occupied', 'Maintenance'],
        default: 'Available'
    },
    admission: {
        type: Schema.Types.ObjectId,
        ref: 'Admission' // This model is implicitly handled via the Admission route logic
    }
}, { timestamps: true });

module.exports = mongoose.model('Bed', BedSchema);