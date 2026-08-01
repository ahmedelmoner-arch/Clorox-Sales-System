const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

const JWT_ISSUER = "clorox-sales-api";
const JWT_AUDIENCE = "clorox-sales-app";

function generateToken(delegate) {
    return jwt.sign(
        {
            id: delegate.id,
            delegateId: delegate.delegateId,
            supervisorCode: delegate.supervisorCode,
            role: delegate.role,
            name: delegate.name
        },
        JWT_SECRET,
        {
            algorithm: "HS256",
            audience: JWT_AUDIENCE,
            expiresIn: "7d",
            issuer: JWT_ISSUER,
            subject: String(delegate.id),
        }
    );
}

module.exports = {
    generateToken
};
