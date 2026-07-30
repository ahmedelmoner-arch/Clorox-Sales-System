const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

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
            expiresIn: "30d"
        }
    );
}

module.exports = {
    generateToken
};
