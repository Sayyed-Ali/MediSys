const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AppointmentSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: { // 'Scheduled', 'Completed', 'Cancelled'
        type: String,
        default: 'Scheduled'
    }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);