const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PatientSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dateOfBirth: {
        type: Date
    },
    contactNumber: {
        type: String
    },
    address: {
        type: String
    },
    medicalHistory: [{ // Sensitive data to be encrypted
        diagnosis: String,
        treatment: String,
        date: Date
    }],
    allergies: [String] // Sensitive data to be encrypted
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);