const User = require('../models/User');
const Driver = require('../models/Driver');
const Artisan = require('../models/Artisan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Helper function to generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // 1) Validate input
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, address, gender, role } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    user = new User({
      name,
      email,
      password, 
      phone,
      address,
      gender,
      role
    });

    await user.save();

    if (role === 'driver') {
      const driver = new Driver({
        user: user._id,
        ...req.body.driverDetails
      });
      await driver.save();
    } else if (role === 'artisan') {
      const artisan = new Artisan({
        user: user._id,
        ...req.body.artisanDetails
      });
      await artisan.save();
    }

    const token = generateToken(user._id, user.role);

    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
      success: true,
      token,
      data: userData
    });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: err.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 2) Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // 3) Generate token
    const token = generateToken(user._id, user.role);

    // 4) Get role-specific profile if exists
    let profile = null;
    if (user.role === 'driver') {
      profile = await Driver.findOne({ user: user._id });
    } else if (user.role === 'artisan') {
      profile = await Artisan.findOne({ user: user._id });
    }

    // 5) Send response (without password)
    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      token,
      data: {
        user: userData,
        profile
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: err.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let profile = null;
    if (user.role === 'driver') {
      profile = await Driver.findOne({ user: user._id });
    } else if (user.role === 'artisan') {
      profile = await Artisan.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        profile
      }
    });

  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: err.message
    });
  }
};