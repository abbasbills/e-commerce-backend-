const { v4: uuidv4 } = require('uuid');
const User            = require('../models/User');
const { generateToken } = require('../middleware/auth');

// ─── POST /api/auth/register ─────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user  = await User.create({ name, email, password, role: 'user' });
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isAnonymous: false },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        isAnonymous: user.isAnonymous,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/anonymous ────────────────────────────────────────────────
// Creates a temporary guest user so cart items are persisted to the database
exports.anonymousLogin = async (req, res, next) => {
  try {
    const guestName  = `Guest_${uuidv4().substring(0, 8)}`;
    const guestEmail = `${guestName.toLowerCase()}@guest.local`;

    const user  = await User.create({
      name:        guestName,
      email:       guestEmail,
      role:        'anonymous',
      isAnonymous: true,
    });

    // Short-lived token for anonymous sessions (24 h)
    const token = generateToken(user._id, user.role, '24h');

    res.status(201).json({
      success: true,
      message: 'Anonymous session created',
      token,
      user: {
        id:          user._id,
        name:        user.name,
        role:        user.role,
        isAnonymous: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/admin/login ──────────────────────────────────────────────
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
