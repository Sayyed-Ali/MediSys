const Inventory = require('../models/Inventory'); // <-- Ensure two dots (../) to go up one level (from services to backend) then into models
const mongoose = require('mongoose');

const listenForInventoryChanges = () => {
    if (mongoose.connection.readyState !== 1) {
        console.warn("WARNING: MongoDB connection not ready. Cannot start Inventory Change Stream.");
        return;
    }

    const LOW_STOCK_THRESHOLD = 20;

    const pipeline = [
        {
            $match: {
                operationType: { $in: ['update', 'replace'] },
                'fullDocument.quantity': { $lt: LOW_STOCK_THRESHOLD }
            }
        }
    ];

    try {
        const changeStream = Inventory.watch(pipeline, { fullDocument: 'updateLookup' });

        changeStream.on('change', async (change) => {
            const doc = change.fullDocument;

            console.log("--- REAL-TIME ALERT ---");
            console.log(`TYPE: Low Stock Warning (${doc.quantity} units)`);
            console.log(`MEDICINE ID: ${doc.medicine}`);
            console.log(`BATCH: ${doc.batchNumber}`);
            console.log(`ACTION: Send notification to Pharmacy/Admin.`);
            console.log("-----------------------");

        });

        changeStream.on('error', (error) => {
            console.error('Inventory Change Stream Error:', error);
        });

        console.log(`[Service] Listening for inventory changes (Threshold: ${LOW_STOCK_THRESHOLD})...`);

    } catch (error) {
        console.error("FATAL Change Stream Setup Error:", error);
    }
};

module.exports = { listenForInventoryChanges };