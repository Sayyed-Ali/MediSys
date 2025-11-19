const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DonorSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastDonationDate: {
        type: Date
    },
    bloodGroup: {
        type: String,
        required: true
    },
    organDonation: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Donor', DonorSchema);