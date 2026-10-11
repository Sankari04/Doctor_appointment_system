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
      WHERE a.patient_id = ? AND a.status IN ('booked', 'confirmed') AND s.date >= CURDATE()`,
      [patientId]
    );

    // Count total appointments (history)
    const [totalCountRows] = await pool.query(
      'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?',
      [patientId]
    );

    // Get 3 most recent appointments
    const [recentAppointments] = await pool.query(
      `SELECT a.id, a.status, s.date, s.session_type, q.queue_number,
              d.name as doctor_name, sp.name as specialization_name
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN specializations sp ON d.specialization_id = sp.id
       LEFT JOIN appointment_queues q ON q.appointment_id = a.id
       WHERE a.patient_id = ?
       ORDER BY s.date DESC, q.sequence_number DESC
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

    // Legacy appointment rows are grouped into the doctor's date/session availability.
    const [slots] = await pool.query(
      `SELECT MIN(id) AS id, date, session_type, MIN(start_time) AS start_time, MAX(end_time) AS end_time
       FROM doctor_slots 
       WHERE doctor_id = ?
       GROUP BY date, session_type
       HAVING date > CURDATE() OR MAX(end_time) > CURTIME()
       ORDER BY date ASC, session_type ASC`,
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
  const { doctor_id, date, session_type } = req.body;
  const patientId = req.user.profileId;

  if (!doctor_id || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !['Morning', 'Evening'].includes(session_type)) {
    return res.status(400).json({ message: 'Please provide doctor_id, date, and a valid session_type' });
  }

  const conn = await pool.getConnection();
  let transactionStarted = false;

  try {
    await conn.beginTransaction();
    transactionStarted = true;

    // Serialize token assignment for this doctor so concurrent requests cannot share a token.
    const [doctorRows] = await conn.query(
      'SELECT id FROM doctors WHERE id = ? AND is_verified = true FOR UPDATE',
      [doctor_id]
    );
    if (doctorRows.length === 0) {
      await conn.rollback();
      transactionStarted = false;
      conn.release();
      return res.status(404).json({ message: 'Doctor not found or not verified' });
    }

    const [slotRows] = await conn.query(
      `SELECT * FROM doctor_slots
       WHERE doctor_id = ? AND date = ? AND session_type = ?
        AND (date > CURDATE() OR (date = CURDATE() AND end_time > CURTIME()))
       ORDER BY id ASC LIMIT 1 FOR UPDATE`,
      [doctor_id, date, session_type]
    );

    if (slotRows.length === 0) {
      await conn.rollback();
      transactionStarted = false;
      conn.release();
      return res.status(404).json({ message: 'This doctor has no available session for the selected date' });
    }

    const slot = slotRows[0];

    const [duplicateRows] = await conn.query(
      `SELECT a.id
       FROM appointments a
       JOIN doctor_slots existing_session ON existing_session.id = a.slot_id
       WHERE a.patient_id = ? AND a.doctor_id = ? AND existing_session.date = ?
         AND existing_session.session_type = ? AND a.status IN ('booked', 'confirmed')
       LIMIT 1`,
      [patientId, doctor_id, date, session_type]
    );
    if (duplicateRows.length > 0) {
      await conn.rollback();
      transactionStarted = false;
      conn.release();
      return res.status(409).json({ message: `You already have an active appointment with this doctor for the ${session_type} session on this date` });
    }

    const [appointmentResult] = await conn.query(
      'INSERT INTO appointments (patient_id, doctor_id, slot_id, status) VALUES (?, ?, ?, ?)',
      [patientId, doctor_id, slot.id, 'booked']
    );
    const newAppointmentId = appointmentResult.insertId;

    const [seqResult] = await conn.query(
      `SELECT COALESCE(MAX(sequence_number), 0) AS max_seq
       FROM appointment_queues
       WHERE doctor_id = ? AND date = ? AND session_type = ?`,
      [doctor_id, date, session_type]
    );
    const nextSeq = Number(seqResult[0].max_seq || 0) + 1;

    await conn.query(
      `INSERT INTO appointment_queues
       (appointment_id, doctor_id, patient_id, date, session_type, queue_number, sequence_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Waiting')`,
      [newAppointmentId, doctor_id, patientId, date, session_type, String(nextSeq), nextSeq]
    );

    const [userRows] = await conn.query(
      `SELECT patient_user.id AS patient_user_id, doctor_user.id AS doctor_user_id, d.name AS doctor_name
       FROM patients p
       JOIN users patient_user ON patient_user.id = p.user_id
       JOIN doctors d ON d.id = ?
       JOIN users doctor_user ON doctor_user.id = d.user_id
       WHERE p.id = ?`,
      [doctor_id, patientId]
    );

    await conn.commit();
    transactionStarted = false;
    conn.release();

    if (userRows.length > 0) {
      await Promise.all([
        createNotification(
          userRows[0].patient_user_id,
          'Appointment Booked',
          `Your appointment with Dr. ${userRows[0].doctor_name} is booked for ${date} (${session_type} session). Your token number is ${nextSeq}.`,
          'appointment'
        ),
        createNotification(
          userRows[0].doctor_user_id,
          'New Appointment Request',
          `A patient booked an appointment for ${date} (${session_type} session), token ${nextSeq}. Please review and confirm it.`,
          'appointment'
        )
      ]);
    }

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointmentId: newAppointmentId,
      doctorName: userRows[0]?.doctor_name,
      date: String(slot.date).slice(0, 10),
      sessionType: slot.session_type,
      queueNumber: String(nextSeq),
      status: 'booked'
    });
  } catch (error) {
    if (transactionStarted) await conn.rollback();
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
      `SELECT a.id as appointment_id, a.status, a.notes, a.prescription, s.id as slot_id,
              s.date, s.session_type, s.start_time, s.end_time, q.queue_number, q.status AS queue_status,
              d.name as doctor_name, d.phone as doctor_phone, sp.name as specialization_name
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN specializations sp ON d.specialization_id = sp.id
       LEFT JOIN appointment_queues q ON q.appointment_id = a.id
       WHERE a.patient_id = ?
       ORDER BY s.date DESC, q.sequence_number DESC`,
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

    // Verify appointment belongs to patient and is currently booked.
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

    await conn.commit();
    conn.release();

    res.json({ message: 'Appointment cancelled successfully. The cancelled token remains in the queue history.' });
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
