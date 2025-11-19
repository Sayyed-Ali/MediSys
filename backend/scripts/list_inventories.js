const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Inventory = require('../models/Inventory');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const list = await Inventory.find().sort({ createdAt: -1 }).limit(50).lean();
    list.forEach(i => {
      console.log({
        id: i._id.toString(),
        medicineId: i.medicine ? i.medicine.toString() : null,
        batch: i.batchNumber,
        expiry: i.expiryDate ? new Date(i.expiryDate).toISOString().split('T')[0] : null,
        qty: i.quantity,
        supplier: i.supplier ? i.supplier.toString() : null,
        createdAt: i.createdAt
      });
    });
    console.log('Total listed:', list.length);
  } catch (err) {
    console.error('Error listing inventories:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
