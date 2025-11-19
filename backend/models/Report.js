// backend/models/Report.js
const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    role: String,
    action: String,
    note: String,
    when: { type: Date, default: Date.now }
}, { _id: false });

const ReportSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedByName: String,
    assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    assignedDoctorName: String,
    fileUrl: String,
    fileName: String,
    mimeType: String,
    notes: String,
    status: { type: String, default: 'uploaded' }, // uploaded, approved, retest_requested, etc.
    history: [HistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);