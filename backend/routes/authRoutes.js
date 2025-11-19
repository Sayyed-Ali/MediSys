const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const auth = require('../middleware/auth'); // your auth middleware

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public (No middleware should run before this)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // CRITICAL: Await the comparison of the plain text password against the stored hash.
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user._id, // User ID (used for linking records)
                role: user.role, // Role (used for RBAC middleware)
                firstName: user.firstName // First Name (for greeting in sidebar)
            }
        };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                // On successful login, return the JWT token and user payload
                res.json({ token, user: payload.user });
            }
        );
    } catch (err) {
        // Log the specific error during comparison/token generation
        console.error("Login attempt failed:", err);
        res.status(500).send('Server Error during authentication.');
    }
});

router.get('/me', auth, async (req, res) => {
    try {
        // make a consistent user shape for frontend
        const u = req.user || {};
        const userObj = {
            id: u.id || u._id,
            firstName: u.firstName || u.first_name || u.name || null,
            lastName: u.lastName || u.last_name || null,
            email: u.email || null,
            role: u.role || null,
        };
        return res.json({ user: userObj });
    } catch (err) {
        console.error('[authRoutes] /me error:', err);
        return res.status(500).json({ error: 'Server error retrieving user' });
    }
});

module.exports = router;
