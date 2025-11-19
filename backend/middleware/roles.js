// middleware/roles.js
module.exports = function (allowed = []) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ msg: 'Unauthorized' });
        if (allowed.length === 0) return next();
        if (!allowed.includes(req.user.role)) return res.status(403).json({ msg: 'Forbidden' });
        next();
    };
};