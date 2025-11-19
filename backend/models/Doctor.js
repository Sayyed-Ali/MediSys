const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DoctorSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialty: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String
    },
    licenseNumber: {
        type: String,
        unique: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', DoctorSchema);