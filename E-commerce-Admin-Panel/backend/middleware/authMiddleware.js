const jwt = require('jsonwebtoken');
const Session = require('../models/Session'); // make sure path is correct

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  try {
    // Step 1: Verify token is properly signed and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 2: Check if this token is still active in the DB
    const session = await Session.findOne({ token });

    if (!session) {
      return res.status(401).json({ message: 'Session expired or logged in from another device' });
    }

    // Attach user info to request
    req.userId = decoded.id;
    req.user = decoded;

    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;