import jwt from 'jsonwebtoken'

// Authorization Middleware
export const authorize = (roles=[]) => {
    // Convert single role to an array
    // if (typeof roles === 'string') {
    //     roles = [roles];
    // }

    return (req, res, next) => {
        const authHeader = req.headers.authorization;

        // Check for token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        try {
            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            // Check if the user's role is authorized
            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ success: false,  message: 'Forbidden: Insufficient permissions' });
            }

            next(); // Proceed to the next middleware or route handler
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
        }
    };
};
