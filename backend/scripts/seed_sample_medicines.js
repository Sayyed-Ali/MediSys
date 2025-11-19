// backend/scripts/seed_sample_medicines.js
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');

const Medicine = require('../models/Medicine');

const uri = process.env.MONGO_URI;
if (!uri) {
    console.error('MONGO_URI not found in env. Edit backend/.env first.');
    process.exit(1);
}

const sample = [
    { name: 'Paracetamol 500mg Tablets', brand: 'Generic', form: 'Tablet', strength: '500mg' },
    { name: 'Amoxicillin 250mg Capsules', brand: 'Generic', form: 'Capsule', strength: '250mg' },
    { name: 'Vitamin C 1000mg Tablets', brand: 'Generic', form: 'Tablet', strength: '1000mg' },
    { name: 'Ibuprofen 400mg Tablets', brand: 'Generic', form: 'Tablet', strength: '400mg' },
    { name: 'Cough Syrup 100ml', brand: 'Generic', form: 'Syrup', strength: '100ml' }
];

async function run() {
    try {
        await mongoose.connect(uri, { dbName: (process.env.DB_NAME || undefined) });
        console.log('Connected to MongoDB for seeding.');
        for (const m of sample) {
            // Try to avoid duplicates by name
            const exists = await Medicine.findOne({ name: m.name }).lean();
            if (exists) {
                console.log('Already exists:', m.name);
                continue;
            }
            const med = new Medicine(m);
            await med.save();
            console.log('Inserted:', m.name);
        }
        console.log('Seeding done.');
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();