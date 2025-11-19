const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

// @route   POST /api/users
// @desc    Register a new user (This can be public or handled by an Admin)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', auth, checkRole(['Admin']), async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;