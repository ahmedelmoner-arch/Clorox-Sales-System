const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const { canonicalRole } = require("../utils/roles");

const JWT_ISSUER = "clorox-sales-api";
const JWT_AUDIENCE = "clorox-sales-app";

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
            JWT_SECRET,
            {
                algorithms: ["HS256"],
                audience: JWT_AUDIENCE,
                issuer: JWT_ISSUER,
            }
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
