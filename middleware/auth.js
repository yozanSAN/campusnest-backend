const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find a consistent user ID
    const userId = decoded.id || decoded.userId || decoded._id || decoded.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Token payload missing user ID' });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid token: User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
};

module.exports = auth;
