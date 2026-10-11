const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register a new patient or doctor
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { email, password, role, name, phone, ...roleDetails } = req.body;

  if (!email || !password || !role || !name || !phone) {
    return res.status(400).json({ message: 'Please provide all required fields (email, password, role, name, phone)' });
  }

  if (role !== 'patient' && role !== 'doctor') {
    return res.status(400).json({ message: 'Invalid role. Role must be patient or doctor.' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Check if user already exists
    const [existingUser] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      conn.release();
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user credentials
    const [userInsertResult] = await conn.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, role]
    );
    const userId = userInsertResult.insertId;

    let profileId = null;

    if (role === 'patient') {
      const { gender, dob } = roleDetails;
      const [patientResult] = await conn.query(
        'INSERT INTO patients (user_id, name, phone, gender, dob) VALUES (?, ?, ?, ?, ?)',
        [userId, name, phone, gender || null, dob || null]
      );
      profileId = patientResult.insertId;
    } else if (role === 'doctor') {
      const { specialization_id, experience, consultation_fee, bio } = roleDetails;
      if (!specialization_id) {
        throw new Error('Specialization is required for doctor registration');
      }
      const [doctorResult] = await conn.query(
        'INSERT INTO doctors (user_id, specialization_id, name, phone, bio, experience, consultation_fee, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          specialization_id,
          name,
          phone,
          bio || null,
          experience || 0,
          consultation_fee || 0.00,
          false // Unverified by default, requires admin approval
        ]
      );
      profileId = doctorResult.insertId;
    }

    await conn.commit();
    conn.release();

    // Generate JWT token
    const token = generateToken({
      id: userId,
      email,
      role,
      profileId
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        email,
        role,
        name,
        profileId,
        isVerified: role === 'doctor' ? false : true
      }
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

// @desc    Login user (Patient, Doctor, or Admin)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    // Retrieve user credentials
    const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (userRows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userRows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    let profileId = null;
    let name = 'Admin';
    let isVerified = true;

    // Fetch corresponding profile based on role
    if (user.role === 'patient') {
      const [patientRows] = await pool.query('SELECT id, name FROM patients WHERE user_id = ?', [user.id]);
      if (patientRows.length > 0) {
        profileId = patientRows[0].id;
        name = patientRows[0].name;
      }
    } else if (user.role === 'doctor') {
      const [doctorRows] = await pool.query('SELECT id, name, is_verified FROM doctors WHERE user_id = ?', [user.id]);
      if (doctorRows.length > 0) {
        profileId = doctorRows[0].id;
        name = doctorRows[0].name;
        isVerified = doctorRows[0].is_verified === 1 || doctorRows[0].is_verified === true;
      }
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      profileId
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name,
        profileId,
        isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user profile details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const { id, role, profileId } = req.user;

    let profileDetails = {};

    if (role === 'patient') {
      const [patientRows] = await pool.query('SELECT * FROM patients WHERE id = ?', [profileId]);
      if (patientRows.length > 0) {
        profileDetails = patientRows[0];
      }
    } else if (role === 'doctor') {
      const [doctorRows] = await pool.query(
        `SELECT d.*, s.name as specialization_name 
         FROM doctors d 
         JOIN specializations s ON d.specialization_id = s.id 
         WHERE d.id = ?`,
        [profileId]
      );
      if (doctorRows.length > 0) {
        profileDetails = doctorRows[0];
      }
    }

    res.json({
      id,
      email: req.user.email,
      role,
      profile: profileDetails
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
