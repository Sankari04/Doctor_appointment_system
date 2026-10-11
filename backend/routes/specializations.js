const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// @desc    Get all specializations
// @route   GET /api/specializations
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM specializations ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching specializations:', error);
    res.status(500).json({ message: 'Server error retrieving specializations' });
  }
});

module.exports = router;
