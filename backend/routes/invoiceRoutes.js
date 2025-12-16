// backend/routes/invoiceRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { Types } = require('mongoose');

const Inventory = require('../models/Inventory');
const Medicine = require('../models/Medicine');
const AuditLog = require('../models/AuditLog');
const InvoiceReview = require('../models/InvoiceReview');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { matchMedicineByName } = require('../utils/matchMedicine');

const upload = multer({ storage: multer.memoryStorage() });

// read from env first, fallback to previous default
const INVOICE_SERVICE_URL = process.env.INVOICE_SERVICE_URL || 'http://127.0.0.1:5001/api/invoice/parse';
const AUTO_MATCH_THRESHOLD = 0.80;
const REVIEW_THRESHOLD = 0.60;

/** Helpers (parseExpiryToDate, escapeRegExp) — (same as before) */
function parseExpiryToDate(text) {
  if (!text) return null;
  const s = String(text).trim();
  let m = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const mm = parseInt(m[1], 10), yyyy = parseInt(m[2], 10);
    if (mm >= 1 && mm <= 12) {
      const date = new Date(yyyy, mm, 0);
      if (!isNaN(date.getTime())) return date;
    }
  }
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch (e) { }
  const y = s.match(/(20\d{2}|19\d{2})/);
  if (y) {
    const year = parseInt(y[1], 10);
    const date = new Date(year, 11, 31);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}
function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * POST /api/invoice/upload
 */
router.post('/upload', auth, checkRole(['Admin']), upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No invoice PDF uploaded (field name: invoice).' });

    // Prepare form for invoice service
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname || 'invoice.pdf',
      contentType: req.file.mimetype || 'application/pdf',
    });

    console.log('[invoiceRoutes] Posting to invoice service:', INVOICE_SERVICE_URL);

    const invoiceResp = await axios.post(INVOICE_SERVICE_URL, form, {
      headers: { ...form.getHeaders() },
      validateStatus: () => true,
      timeout: 600000,
    });

    console.log('[invoiceRoutes] Invoice service status:', invoiceResp.status);

    if (invoiceResp.status !== 200) {
      console.error('[invoiceRoutes] Invoice service error body:', invoiceResp.data);
      // Upstream failing -> 502 Bad Gateway
      return res.status(502).json({ error: `Invoice service returned ${invoiceResp.status}`, details: invoiceResp.data });
    }

    if (!invoiceResp.data || !Array.isArray(invoiceResp.data.rows)) {
      console.error('[invoiceRoutes] Unexpected response shape:', invoiceResp.data);
      return res.status(500).json({ msg: 'Invoice service returned unexpected response', raw: invoiceResp.data });
    }

    const rows = invoiceResp.data.rows;
    const autoAdded = [];
    const needsReview = [];
    const supplierId = (req.body && req.body.supplierId) ? new Types.ObjectId(req.body.supplierId) : undefined;

    // Process rows — (unchanged logic from your original)
    for (const r of rows) {
      const desc = (r.description || '').trim();
      const qty = Number(r.quantity || 0);
      const batch = (r.batch || '').trim() || 'UNKNOWN';
      const expiryRaw = r.expiry || null;
      const price = r.price ? Number(r.price) : null;

      if (!desc || !qty || qty <= 0) {
        needsReview.push({ row: r, reason: 'missing description or non-positive quantity' });
        continue;
      }

      let matchedMedicine = null;
      let rating = 0;
      const medCount = await Medicine.countDocuments().catch(e => { console.warn('[invoiceRoutes] med count error:', e); return 0; });

      if (!medCount) {
        const nameExact = desc;
        matchedMedicine = await Medicine.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(nameExact)}$`, 'i') } });
        if (!matchedMedicine) {
          const newMed = new Medicine({
            name: nameExact,
            brand: (r.brand || 'Unknown') || 'Unknown',
            form: r.form || 'Unknown',
            strength: r.strength || ''
          });
          await newMed.save();
          matchedMedicine = newMed;
          console.log('[invoiceRoutes] Created medicine from invoice (master list empty):', newMed.name);
        }
        rating = 1;
      } else {
        const match = await matchMedicineByName(desc);
        rating = match?.rating ?? 0;
        matchedMedicine = match?.medicine ?? null;
      }

      if (rating >= AUTO_MATCH_THRESHOLD && matchedMedicine) {
        const parsedExpiry = parseExpiryToDate(expiryRaw);
        let updatedInventory = null;

        if (parsedExpiry) {
          try {
            updatedInventory = await Inventory.findOneAndUpdate(
              { medicine: matchedMedicine._id, batchNumber: batch, expiryDate: parsedExpiry },
              { $inc: { quantity: qty } },
              { new: true }
            );
          } catch (err) {
            console.warn('[invoiceRoutes] exact expiry update failed', err && err.message ? err.message : err);
          }

          if (!updatedInventory) {
            const start = new Date(parsedExpiry.getFullYear(), parsedExpiry.getMonth(), 1);
            const end = new Date(parsedExpiry.getFullYear(), parsedExpiry.getMonth() + 1, 0, 23, 59, 59, 999);
            updatedInventory = await Inventory.findOneAndUpdate(
              { medicine: matchedMedicine._id, batchNumber: batch, expiryDate: { $gte: start, $lte: end } },
              { $inc: { quantity: qty } },
              { new: true }
            );
          }
        }

        if (!updatedInventory) {
          updatedInventory = await Inventory.findOneAndUpdate(
            { medicine: matchedMedicine._id, batchNumber: batch },
            { $inc: { quantity: qty } },
            { new: true }
          );
        }

        if (updatedInventory) {
          autoAdded.push({ row: r, inventoryId: updatedInventory._id, medicine: matchedMedicine.name, rating });
        } else {
          const invObj = { medicine: matchedMedicine._id, batchNumber: batch, quantity: qty };
          if (parsedExpiry) invObj.expiryDate = parsedExpiry;
          if (supplierId) invObj.supplier = supplierId;
          const newInv = new Inventory(invObj);
          await newInv.save();
          autoAdded.push({ row: r, inventoryId: newInv._id, medicine: matchedMedicine.name, rating });
        }
      } else if (rating >= REVIEW_THRESHOLD && matchedMedicine) {
        needsReview.push({ row: r, candidateMatches: [{ medicine: matchedMedicine, rating }], rating });
      } else {
        const matchCandidate = await matchMedicineByName(desc);
        needsReview.push({ row: r, candidateMatches: matchCandidate ? [{ medicine: matchCandidate.medicine, rating: matchCandidate.rating }] : [], rating: matchCandidate?.rating ?? 0 });
      }
    }

    // save needsReview
    for (const n of needsReview) {
      try {
        await InvoiceReview.create({
          description: n.row.description || n.row.desc || '',
          batch: n.row.batch || '',
          expiry: n.row.expiry || '',
          quantity: Number(n.row.quantity || 0),
          price: n.row.price ? Number(n.row.price) : null,
          raw: n.row.raw || [],
          candidateMatches: (n.candidateMatches || []).map(c => ({ medicine: c.medicine ? c.medicine._id : undefined, rating: c.rating || 0 })).filter(x => x.medicine)
        });
      } catch (e) {
        console.warn('[invoiceRoutes] save review error:', e && e.message ? e.message : e);
      }
    }

    const audit = new AuditLog({
      action: 'invoice_import',
      user: req.user?.id || null,
      summary: { fileName: req.file.originalname, autoAddedCount: autoAdded.length, needsReviewCount: needsReview.length },
      rawRowsCount: rows.length,
      rawResponse: invoiceResp.data
    });
    await audit.save();

    return res.status(200).json({ msg: 'Invoice processed', autoAdded, needsReviewCount: needsReview.length, auditId: audit._id });

  } catch (err) {
    console.error('Invoice upload error:', (err && err.message) ? err.message : err);
    try { console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err))); } catch (e) { }
    if (err.response) {
      console.error('Invoice service response (status):', err.response.status);
      console.error('Invoice service response (data):', err.response.data);
      console.error('Invoice service response (headers):', err.response.headers);
      // If upstream responded with a status, return 502 to indicate upstream failure
      return res.status(502).json({ error: `Invoice service responded ${err.response.status}`, details: err.response.data });
    }
    return res.status(500).json({ error: err.message || 'Server error while processing invoice.' });
  }
});

// Review endpoints unchanged...
// (Paste rest of your existing review endpoints here - unchanged)

module.exports = router;