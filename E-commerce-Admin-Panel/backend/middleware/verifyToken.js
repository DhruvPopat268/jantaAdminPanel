const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const token=req.cookies.token || req.headers.authorization?.split(' ')[ 1 ]

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token,JWT_SECRET);
    req.admin = decoded.adminId;
    console.log(token) // THIS must match how you signed the token
    next();
  } catch (err) {
    console.log(err)
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;