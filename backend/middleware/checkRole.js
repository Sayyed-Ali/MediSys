const checkRole = (allowedRoles) => (req, res, next) => {
    const userRole = req.user.role;
    if (allowedRoles.includes(userRole)) {
        next();
    } else {
        res.status(403).json({ msg: 'Access denied: Insufficient permissions' });
    }
};

module.exports = checkRole;