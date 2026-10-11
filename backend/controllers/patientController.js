const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// @desc    Get patient dashboard stats
// @route   GET /api/patients/dashboard
// @access  Private (Patient only)
const getPatientDashboard = async (req, res) => {
  try {
    const patientId = req.user.profileId;

    // Count upcoming booked appointments
    const [upcomingCountRows] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
      WHERE a.patient_id = ? AND a.status IN ('booked', 'confirmed') AND (s.date > CURDATE() OR (s.date = CURDATE() AND s.start_time >= CURTIME()))`,
      [patientId]
    );

    // Count total appointments (history)
    const [totalCountRows] = await pool.query(
      'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?',
      [patientId]
    );

    // Get 3 most recent appointments
    const [recentAppointments] = await pool.query(
      `SELECT a.id, a.status, s.date, s.start_time, s.end_time, d.name as doctor_name, sp.name as specialization_name
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN specializations sp ON d.specialization_id = sp.id
       WHERE a.patient_id = ?
       ORDER BY s.date DESC, s.start_time DESC
       LIMIT 3`,
      [patientId]
    );

    res.json({
      stats: {
        upcomingAppointments: upcomingCountRows[0].count,
        totalAppointments: totalCountRows[0].count
      },
      recentAppointments
    });
  } catch (error) {
    console.error('Patient dashboard error:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard statistics' });
  }
};

// @desc    Search and filter verified doctors
// @route   GET /api/patients/doctors
// @access  Private (Patient only)
const searchDoctors = async (req, res) => {
  try {
    const { name, specialization_id } = req.query;

    let query = `
      SELECT d.id, d.name, d.phone, d.bio, d.experience, d.consultation_fee, s.name as specialization_name
      FROM doctors d
      JOIN specializations s ON d.specialization_id = s.id
      WHERE d.is_verified = true
    `;
    const params = [];

    if (name) {
      query += ' AND d.name LIKE ?';
      params.push(`%${name}%`);
    }

    if (specialization_id) {
      query += ' AND d.specialization_id = ?';
      params.push(specialization_id);
    }

    query += ' ORDER BY d.name ASC';

    const [doctors] = await pool.query(query, params);
    res.json(doctors);
  } catch (error) {
    console.error('Search doctors error:', error);
    res.status(500).json({ message: 'Server error searching doctors' });
  }
};

// @desc    Get doctor profile and available slots
// @route   GET /api/patients/doctors/:id
// @access  Private (Patient only)
const getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.params.id;

    // Get doctor metadata
    const [doctorRows] = await pool.query(
      `SELECT d.id, d.name, d.phone, d.bio, d.experience, d.consultation_fee, s.name as specialization_name
       FROM doctors d
       JOIN specializations s ON d.specialization_id = s.id
       WHERE d.id = ? AND d.is_verified = true`,
      [doctorId]
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({ message: 'Doctor not found or not verified' });
    }

    // Get available unbooked slots (only current/future dates, or today future times) - MySQL filtering
    const [slots] = await pool.query(
      `SELECT id, date, start_time, end_time 
       FROM doctor_slots 
       WHERE doctor_id = ? AND is_booked = false 
         AND (date > CURDATE() OR (date = CURDATE() AND start_time >= CURTIME()))
       ORDER BY date ASC, start_time ASC`,
      [doctorId]
    );

    res.json({
      doctor: doctorRows[0],
      slots
    });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ message: 'Server error retrieving doctor profile' });
  }
};

// @desc    Book an appointment
// @route   POST /api/patients/appointments
// @access  Private (Patient only)
const bookAppointment = async (req, res) => {
  const { doctor_id, slot_id } = req.body;
  const patientId = req.user.profileId;

  if (!doctor_id || !slot_id) {
    return res.status(400).json({ message: 'Please provide doctor_id and slot_id' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Verify slot is available and belongs to doctor, locking the row to prevent concurrency issues
    // SELECT without FOR UPDATE for compatibility with SQLite; transaction protects updates
    const [slotRows] = await conn.query(
      'SELECT * FROM doctor_slots WHERE id = ? AND doctor_id = ? FOR UPDATE',
      [slot_id, doctor_id]
    );

    if (slotRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Time slot not found' });
    }

    const slot = slotRows[0];

    if (slot.is_booked) {
      conn.release();
      return res.status(400).json({ message: 'This slot is already booked by another patient' });
    }

    // Mark slot as booked
    await conn.query(
      'UPDATE doctor_slots SET is_booked = true WHERE id = ?',
      [slot_id]
    );

    // Create appointment
    const [appointmentResult] = await conn.query(
      'INSERT INTO appointments (patient_id, doctor_id, slot_id, status) VALUES (?, ?, ?, ?)',
      [patientId, doctor_id, slot_id, 'booked']
    );
    const newAppointmentId = appointmentResult.insertId;

    const [userRows] = await conn.query(
      `SELECT patient_user.id AS patient_user_id, doctor_user.id AS doctor_user_id, d.name AS doctor_name
       FROM patients p
       JOIN users patient_user ON patient_user.id = p.user_id
       JOIN doctors d ON d.id = ?
       JOIN users doctor_user ON doctor_user.id = d.user_id
       WHERE p.id = ?`,
      [doctor_id, patientId]
    );

    // Generate queue number for this doctor, date, and session (Morning vs Evening)
    const slotDate = slot.date;
    const startHour = parseInt(String(slot.start_time).split(':')[0], 10);
    const sessionType = startHour < 12 ? 'Morning' : 'Evening';
    const prefix = sessionType === 'Morning' ? 'M' : 'E';

    const [seqResult] = await conn.query(
      `SELECT COALESCE(MAX(sequence_number), 0) as max_seq 
       FROM appointment_queues 
       WHERE doctor_id = ? AND date = ? AND session_type = ?`,
      [doctor_id, slotDate, sessionType]
    );
    const nextSeq = (seqResult[0].max_seq || 0) + 1;
    const queueNumber = `${prefix}${String(nextSeq).padStart(2, '0')}`;

    await conn.query(
      `INSERT INTO appointment_queues 
       (appointment_id, doctor_id, patient_id, date, session_type, queue_number, sequence_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Waiting')`,
      [newAppointmentId, doctor_id, patientId, slotDate, sessionType, queueNumber, nextSeq]
    );

    await conn.commit();
    conn.release();

    if (userRows.length > 0) {
      await Promise.all([
        createNotification(
          userRows[0].patient_user_id,
          'Appointment Booked',
          `Your appointment with Dr. ${userRows[0].doctor_name} is booked for ${slotDate} at ${String(slot.start_time).slice(0, 5)}.`,
          'appointment'
        ),
        createNotification(
          userRows[0].doctor_user_id,
          'New Appointment Request',
          `A patient booked an appointment for ${slotDate} at ${String(slot.start_time).slice(0, 5)}. Please review and confirm it.`,
          'appointment'
        )
      ]);
    }

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointmentId: newAppointmentId,
      queueNumber,
      sessionType
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Book appointment error:', error);
    res.status(500).json({ message: 'Server error during booking' });
  }
};

// @desc    View patient appointments
// @route   GET /api/patients/appointments
// @access  Private (Patient only)
const getMyAppointments = async (req, res) => {
  try {
    const patientId = req.user.profileId;

    const [appointments] = await pool.query(
      `SELECT a.id as appointment_id, a.status, a.notes, a.prescription, s.id as slot_id, s.date, s.start_time, s.end_time,
              d.name as doctor_name, d.phone as doctor_phone, sp.name as specialization_name
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN specializations sp ON d.specialization_id = sp.id
       WHERE a.patient_id = ?
       ORDER BY s.date DESC, s.start_time DESC`,
      [patientId]
    );

    if (appointments.length > 0) {
      const appointmentIds = appointments.map(appointment => appointment.appointment_id);
      const [medications] = await pool.query(
        `SELECT id, appointment_id, name, dosage, frequency, times, start_date, end_date, instructions, status
         FROM medications WHERE appointment_id IN (?) ORDER BY id ASC`,
        [appointmentIds]
      );
      appointments.forEach(appointment => {
        appointment.medications = medications.filter(medication => medication.appointment_id === appointment.appointment_id);
      });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error retrieving appointments' });
  }
};

// @desc    Cancel an appointment
// @route   POST /api/patients/appointments/:id/cancel
// @access  Private (Patient only)
const cancelAppointment = async (req, res) => {
  const appointmentId = req.params.id;
  const patientId = req.user.profileId;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Verify appointment belongs to patient and is currently booked
    // SELECT without FOR UPDATE for SQLite compatibility; transaction will ensure consistency
    const [appointmentRows] = await conn.query(
      'SELECT * FROM appointments WHERE id = ? AND patient_id = ? FOR UPDATE',
      [appointmentId, patientId]
    );

    if (appointmentRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentRows[0];

    if (!['booked', 'confirmed'].includes(appointment.status)) {
      conn.release();
      return res.status(400).json({ message: `Appointment cannot be cancelled because it is already ${appointment.status}` });
    }

    // Update appointment status to 'cancelled'
    await conn.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
      [appointmentId]
    );

    // Update queue status
    await conn.query(
      "UPDATE appointment_queues SET status = 'Cancelled' WHERE appointment_id = ?",
      [appointmentId]
    );

    // Release the slot
    await conn.query(
      'UPDATE doctor_slots SET is_booked = false WHERE id = ?',
      [appointment.slot_id]
    );

    await conn.commit();
    conn.release();

    res.json({ message: 'Appointment cancelled successfully. Time slot is now available.' });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error during cancellation' });
  }
};

// @desc    Delete a completed appointment from the patient's history
// @route   DELETE /api/patients/appointments/:id
// @access  Private (Patient only)
const deleteCompletedAppointment = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM appointments WHERE id = ? AND patient_id = ? AND status = 'completed'",
      [req.params.id, req.user.profileId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Completed appointment not found' });
    }

    res.json({ message: 'Completed appointment deleted successfully' });
  } catch (error) {
    console.error('Delete completed appointment error:', error);
    res.status(500).json({ message: 'Server error deleting appointment' });
  }
};

module.exports = {
  getPatientDashboard,
  searchDoctors,
  getDoctorProfile,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  deleteCompletedAppointment
};
