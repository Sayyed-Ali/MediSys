// backend/routes/reportRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose'); // used to validate ObjectId
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

const router = express.Router();

/**
 * Upload folder — ensure it exists
 * Layout: <project-root>/uploads/reports
 */
const uploadDir = path.join(__dirname, '..', 'uploads', 'reports');
fs.mkdirSync(uploadDir, { recursive: true });
console.log('[reportRoutes] uploadDir:', uploadDir);

/**
 * Multer storage: clean filenames, prefix with timestamp
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext)
            .replace(/[^\w\-\. ]+/g, '')   // remove weird chars
            .replace(/\s+/g, '_')          // spaces -> underscore
            .slice(0, 120);                // keep reasonably short
        cb(null, `${Date.now()}-${base}${ext}`);
    }
});

// Allowed types and file size limit
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
            return cb(new Error('Only PDF, JPG and PNG files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: MAX_FILE_SIZE }
});

/**
 * Helper: safe remove uploaded file (if DB operation fails)
 */
function safeUnlink(filePath) {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
        console.warn('[reportRoutes] safeUnlink error:', e?.message || e);
    }
}

/**
 * Helper: centralized upload handler used by both '/' and '/upload'
 * Expects:
 *  - file in field 'report' (frontend: formData.append('report', file))
 *  - optional form fields: patientId (or patientIdentifier), assignedDoctor, notes
 */
const handleUpload = async (req, res) => {
    try {
        const { patientId, patientIdentifier } = req.body;
        const assignedDoctorRaw = req.body.assignedDoctor || req.body.assignTo || null;
        const notes = req.body.notes || '';

        if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

        // Build file path/url
        const fileUrl = `/uploads/reports/${req.file.filename}`;
        const storedFileName = req.file.filename;

        // Attempt to coerce to ObjectId if value looks valid,
        // otherwise keep null and store a human-readable field.
        const obj = {};
        if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
            obj.patientId = mongoose.Types.ObjectId(patientId);
        } else if (patientIdentifier) {
            obj.patientIdentifier = String(patientIdentifier).trim();
        } else if (patientId) {
            // received something but not a valid ObjectId (like "3001")
            obj.patientIdentifier = String(patientId).trim();
        }

        if (assignedDoctorRaw && mongoose.Types.ObjectId.isValid(assignedDoctorRaw)) {
            obj.assignedDoctor = mongoose.Types.ObjectId(assignedDoctorRaw);
            obj.assignedDoctorName = undefined;
        } else if (assignedDoctorRaw) {
            obj.assignedDoctorName = String(assignedDoctorRaw).trim();
        }

        // Add uploader info (req.user is provided by auth middleware)
        const createDoc = {
            ...obj,
            uploadedBy: req.user._id,
            uploadedByName: req.user.firstName || req.user.email || 'PathLab',
            fileUrl,
            fileName: req.file.originalname,
            storedFileName,
            mimeType: req.file.mimetype,
            notes,
            status: 'uploaded',
            history: [{
                by: req.user._id,
                byName: req.user.firstName || req.user.email,
                role: req.user.role,
                action: 'uploaded',
                note: notes,
                when: new Date()
            }]
        };

        const doc = await Report.create(createDoc);
        return res.json(doc);
    } catch (err) {
        console.error('[reportRoutes] POST / upload error (DB or other):', err?.message || err);

        // If we uploaded the file but DB failed, remove the file so disk doesn't fill
        if (req.file && req.file.path) {
            safeUnlink(req.file.path);
            console.log('[reportRoutes] removed uploaded file after failure:', req.file.path);
        }

        // Multer errors handling
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ msg: `File too large. Max size ${MAX_FILE_SIZE / (1024 * 1024)} MB.` });
            }
            return res.status(400).json({ msg: err.message });
        }

        // custom fileFilter rejection
        if (err.message && err.message.includes('Only PDF')) {
            return res.status(400).json({ msg: err.message });
        }

        return res.status(500).json({ msg: 'Upload failed' });
    }
};

/* --------------------
   ROUTES
   -------------------- */

// List reports (role-filtered)
router.get('/', auth, async (req, res) => {
    try {
        const q = {};
        if (req.user.role === 'PathLab') q.uploadedBy = req.user._id;
        if (req.user.role === 'Doctor') q.assignedDoctor = req.user._id;
        if (req.user.role === 'Patient') q.patientId = req.user._id;

        const reports = await Report.find(q).sort({ createdAt: -1 }).lean();

        // convenience fields (avoid leaking large nested objects)
        const out = reports.map(r => ({
            ...r,
            uploadedByName: r.uploadedByName || r.uploadedBy,
            assignedDoctorName: r.assignedDoctorName || r.assignedDoctor,
        }));

        res.json(out);
    } catch (err) {
        console.error('[reportRoutes] GET / error:', err);
        res.status(500).json({ msg: 'Failed to list reports' });
    }
});

// Get single report metadata
router.get('/:id', auth, async (req, res) => {
    try {
        const r = await Report.findById(req.params.id).lean();
        if (!r) return res.status(404).json({ msg: 'Report not found' });

        // RBAC checks
        if (req.user.role === 'Patient' && String(r.patientId) !== String(req.user._id)) {
            return res.status(403).json({ msg: 'Forbidden' });
        }
        if (req.user.role === 'PathLab' && String(r.uploadedBy) !== String(req.user._id)) {
            return res.status(403).json({ msg: 'Forbidden' });
        }
        if (req.user.role === 'Doctor' && r.assignedDoctor && String(r.assignedDoctor) !== String(req.user._id)) {
            return res.status(403).json({ msg: 'Forbidden' });
        }

        res.json(r);
    } catch (err) {
        console.error('[reportRoutes] GET /:id error:', err);
        res.status(500).json({ msg: 'Failed to fetch report' });
    }
});

// Download/serve file (extra checks)
router.get('/:id/download', auth, async (req, res) => {
    try {
        const r = await Report.findById(req.params.id).lean();
        if (!r) return res.status(404).json({ msg: 'Report not found' });

        // RBAC checks
        if (req.user.role === 'Patient' && String(r.patientId) !== String(req.user._id)) {
            return res.status(403).json({ msg: 'Forbidden' });
        }
        if (req.user.role === 'PathLab' && String(r.uploadedBy) !== String(req.user._id)) {
            return res.status(403).json({ msg: 'Forbidden' });
        }
        if (req.user.role === 'Doctor' && r.assignedDoctor && String(r.assignedDoctor) !== String(req.user._id)) {
            return res.status(403).json({ msg: 'Forbidden' });
        }

        const filePath = path.join(uploadDir, r.storedFileName || path.basename(r.fileUrl || ''));
        if (!fs.existsSync(filePath)) return res.status(404).json({ msg: 'File not found on server' });

        res.download(filePath, r.fileName || path.basename(filePath));
    } catch (err) {
        console.error('[reportRoutes] GET /:id/download error:', err);
        res.status(500).json({ msg: 'Failed to download file' });
    }
});

// Primary upload endpoints
// Note: frontend should use field name 'report' (formData.append('report', file))
router.post('/', auth, roles(['PathLab']), upload.single('report'), handleUpload);
router.post('/upload', auth, roles(['PathLab']), upload.single('report'), handleUpload);

// Approve a report (Doctor/Admin)
router.post('/:id/approve', auth, roles(['Doctor', 'Admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const r = await Report.findById(id);
        if (!r) return res.status(404).json({ msg: 'Report not found' });

        r.status = 'approved';
        r.history = r.history || [];
        r.history.push({
            by: req.user._id,
            byName: req.user.firstName || req.user.email,
            role: req.user.role,
            action: 'approved',
            note: note || '',
            when: new Date()
        });
        await r.save();
        res.json({ ok: true, report: r });
    } catch (err) {
        console.error('[reportRoutes] POST /:id/approve error:', err);
        res.status(500).json({ msg: 'Approve failed' });
    }
});

// Request retest
router.post('/:id/request-retest', auth, roles(['Doctor', 'Admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const r = await Report.findById(id);
        if (!r) return res.status(404).json({ msg: 'Report not found' });

        r.status = 'retest_requested';
        r.history = r.history || [];
        r.history.push({
            by: req.user._id,
            byName: req.user.firstName || req.user.email,
            role: req.user.role,
            action: 'retest_requested',
            note: note || '',
            when: new Date()
        });
        await r.save();
        res.json({ ok: true, report: r });
    } catch (err) {
        console.error('[reportRoutes] POST /:id/request-retest error:', err);
        res.status(500).json({ msg: 'Request retest failed' });
    }
});

// Delete report (PathLab who uploaded or Admin)
router.delete('/:id', auth, roles(['PathLab', 'Admin']), async (req, res) => {
    try {
        const r = await Report.findById(req.params.id);
        if (!r) return res.status(404).json({ msg: 'Report not found' });

        if (req.user.role === 'PathLab' && String(r.uploadedBy) !== String(req.user._id)) {
            return res.status(403).json({ msg: 'Forbidden' });
        }

        const filePath = path.join(uploadDir, r.storedFileName || path.basename(r.fileUrl || ''));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await r.remove();
        res.json({ ok: true });
    } catch (err) {
        console.error('[reportRoutes] DELETE /:id error:', err);
        res.status(500).json({ msg: 'Delete failed' });
    }
});

module.exports = router;