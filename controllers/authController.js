const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// @desc    Admin login & get token
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide both username and password' });
    }

    // Check if admin exists
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin username or password' });
    }

    // Check password match
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET || 'your_super_secret_key',
      { expiresIn: '30d' }
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error during login authentication' });
  }
};

module.exports = { loginAdmin };
