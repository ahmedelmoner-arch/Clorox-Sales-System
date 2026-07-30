const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const { canonicalRole } = require("../utils/roles");

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header is required"
            });
        }

        const token = authHeader.replace("Bearer ", "");

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });

    }
}

function authorizeRoles(...roles) {
    const allowedRoles = new Set(roles.map((role) => canonicalRole(role)));
    return (req, res, next) => {
        if (allowedRoles.has(canonicalRole(req.user?.role))) return next();
        return res.status(403).json({
            success: false,
            message: "You do not have permission to access this resource"
        });
    };
}

module.exports = {
    authenticate,
    authorizeRoles
};
