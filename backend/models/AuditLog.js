// backend/models/AuditLog.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
    action: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    summary: { type: Schema.Types.Mixed }, // small summary object
    rawRowsCount: { type: Number, default: 0 },
    rawResponse: { type: Schema.Types.Mixed }, // store the service response for auditing
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);