const pool = require('../config/db');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
const getAdminDashboard = async (req, res) => {
  try {
    // 1. Total registered users and doctors
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [doctorCount] = await pool.query('SELECT COUNT(*) as count FROM doctors');

    // 2. Total verified doctors
    const [verifiedDoctorCount] = await pool.query('SELECT COUNT(*) as count FROM doctors WHERE is_verified = true');

    // 3. Total pending (unverified) doctors
    const [pendingDoctorCount] = await pool.query('SELECT COUNT(*) as count FROM doctors WHERE is_verified = false');

    // 4. Total appointments count
    const [appointmentCount] = await pool.query('SELECT COUNT(*) as count FROM appointments');

    res.json({
      stats: {
        totalUsers: userCount[0].count,
        totalDoctors: doctorCount[0].count,
        verifiedDoctors: verifiedDoctorCount[0].count,
        pendingDoctors: pendingDoctorCount[0].count,
        totalAppointments: appointmentCount[0].count
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error retrieving admin statistics' });
  }
};

// @desc    Get all doctors (verified and unverified)
// @route   GET /api/admin/doctors
// @access  Private (Admin only)
const getAllDoctors = async (req, res) => {
  try {
    const [doctors] = await pool.query(
      `SELECT d.id, d.name, d.phone, d.bio, d.experience, d.consultation_fee, d.is_verified, d.created_at,
              s.name as specialization_name, u.email
       FROM doctors d
       JOIN specializations s ON d.specialization_id = s.id
       JOIN users u ON d.user_id = u.id
       ORDER BY d.is_verified ASC, d.created_at DESC`
    );

    res.json(doctors);
  } catch (error) {
    console.error('Admin get doctors error:', error);
    res.status(500).json({ message: 'Server error retrieving doctors list' });
  }
};

// @desc    Approve/verify doctor
// @route   PUT /api/admin/doctors/:id/verify
// @access  Private (Admin only)
const verifyDoctor = async (req, res) => {
  const doctorId = req.params.id;

  try {
    // Check if doctor exists
    const [doctorRows] = await pool.query('SELECT id, is_verified FROM doctors WHERE id = ?', [doctorId]);

    if (doctorRows.length === 0) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    if (doctorRows[0].is_verified) {
      return res.status(400).json({ message: 'Doctor is already verified' });
    }

    // Verify doctor
    await pool.query('UPDATE doctors SET is_verified = true WHERE id = ?', [doctorId]);

    res.json({ message: 'Doctor verified successfully. They can now receive appointments.' });
  } catch (error) {
    console.error('Verify doctor error:', error);
    res.status(500).json({ message: 'Server error verifying doctor' });
  }
};

// @desc    Reject/unverify doctor
// @route   PUT /api/admin/doctors/:id/reject
// @access  Private (Admin only)
const rejectDoctor = async (req, res) => {
  const doctorId = req.params.id;

  try {
    // Check if doctor exists
    const [doctorRows] = await pool.query('SELECT id, is_verified FROM doctors WHERE id = ?', [doctorId]);

    if (doctorRows.length === 0) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // Reject doctor
    await pool.query('UPDATE doctors SET is_verified = false WHERE id = ?', [doctorId]);

    res.json({ message: 'Doctor rejected successfully. They can no longer receive appointments.' });
  } catch (error) {
    console.error('Reject doctor error:', error);
    res.status(500).json({ message: 'Server error rejecting doctor' });
  }
};

// @desc    Delete doctor profile and user account
// @route   DELETE /api/admin/doctors/:id
// @access  Private (Admin only)
const deleteDoctor = async (req, res) => {
  const doctorId = req.params.id;

  try {
    // Get user_id associated with this doctor
    const [doctorRows] = await pool.query('SELECT user_id FROM doctors WHERE id = ?', [doctorId]);

    if (doctorRows.length === 0) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const userId = doctorRows[0].user_id;

    // Delete user (will cascade delete doctors, slots, appointments)
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'Doctor profile and associated user account deleted successfully.' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Server error deleting doctor profile' });
  }
};

module.exports = {
  getAdminDashboard,
  getAllDoctors,
  verifyDoctor,
  rejectDoctor,
  deleteDoctor
};
