const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// @desc    Get doctor dashboard stats
// @route   GET /api/doctors/dashboard
// @access  Private (Doctor only)
const getDoctorDashboard = async (req, res) => {
  try {
    const doctorId = req.user.profileId;

    // Count today's appointments
    const [todaysAppointments] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
      WHERE a.doctor_id = ? AND a.status IN ('booked', 'confirmed') AND s.date = CURDATE()`,
      [doctorId]
    );

    // Count total upcoming appointments
    const [upcomingAppointments] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
      WHERE a.doctor_id = ? AND a.status IN ('booked', 'confirmed') AND s.date >= CURDATE()`,
      [doctorId]
    );

    // Count total slots created
    const [totalSlots] = await pool.query(
      'SELECT COUNT(DISTINCT date, session_type) as count FROM doctor_slots WHERE doctor_id = ?',
      [doctorId]
    );

    // Get 3 upcoming appointments
    const [recentAppointments] = await pool.query(
      `SELECT a.id as appointment_id, a.status, s.date, s.session_type, s.start_time, s.end_time,
              q.queue_number, p.name as patient_name, p.phone as patient_phone
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN appointment_queues q ON q.appointment_id = a.id
      WHERE a.doctor_id = ? AND a.status IN ('booked', 'confirmed') AND s.date >= CURDATE()
       ORDER BY s.date ASC, q.sequence_number ASC
       LIMIT 3`,
      [doctorId]
    );

    res.json({
      stats: {
        todaysAppointments: todaysAppointments[0].count,
        upcomingAppointments: upcomingAppointments[0].count,
        totalSlots: totalSlots[0].count
      },
      recentAppointments
    });
  } catch (error) {
    console.error('Doctor dashboard error:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard statistics' });
  }
};

// @desc    Get doctor profile
// @route   GET /api/doctors/profile
// @access  Private (Doctor only)
const getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user.profileId;

    const [doctorRows] = await pool.query(
      `SELECT d.*, u.email, s.name as specialization_name 
       FROM doctors d 
       JOIN users u ON d.user_id = u.id 
       JOIN specializations s ON d.specialization_id = s.id 
       WHERE d.id = ?`,
      [doctorId]
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    res.json(doctorRows[0]);
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ message: 'Server error retrieving doctor profile' });
  }
};

// @desc    Update doctor profile
// @route   PUT /api/doctors/profile
// @access  Private (Doctor only)
const updateDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user.profileId;
    const { name, phone, bio, experience, consultation_fee, specialization_id } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required fields' });
    }

    await pool.query(
      `UPDATE doctors 
       SET name = ?, phone = ?, bio = ?, experience = ?, consultation_fee = ?, specialization_id = ? 
       WHERE id = ?`,
      [name, phone, bio || null, experience || 0, consultation_fee || 0.00, specialization_id, doctorId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({ message: 'Server error updating doctor profile' });
  }
};

// @desc    Get all slots created by doctor
// @route   GET /api/doctors/slots
// @access  Private (Doctor only)
const getDoctorSlots = async (req, res) => {
  try {
    const doctorId = req.user.profileId;

    const [slots] = await pool.query(
      `SELECT MIN(id) AS id, date, session_type, MIN(start_time) AS start_time,
              MAX(end_time) AS end_time, MAX(is_booked) AS is_booked
       FROM doctor_slots
       WHERE doctor_id = ?
       GROUP BY date, session_type
       ORDER BY date DESC, session_type ASC`,
      [doctorId]
    );

    res.json(slots);
  } catch (error) {
    console.error('Get doctor slots error:', error);
    res.status(500).json({ message: 'Server error retrieving slots' });
  }
};

// @desc    Add a doctor's date and session availability
// @route   POST /api/doctors/slots
// @access  Private (Doctor only)
const addDoctorSlots = async (req, res) => {
  const doctorId = req.user.profileId;
  const { date, session_type, start_time, end_time } = req.body;

  if (!date || !['Morning', 'Evening'].includes(session_type) || !start_time || !end_time) {
    return res.status(400).json({ message: 'Please provide a date, session_type, start_time, and end_time' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || start_time >= end_time) {
    return res.status(400).json({ message: 'Provide a valid date and ensure session start time is earlier than its end time' });
  }

  let conn;
  let transactionStarted = false;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    transactionStarted = true;
    await conn.query('SELECT id FROM doctors WHERE id = ? FOR UPDATE', [doctorId]);

    const [existing] = await conn.query(
      'SELECT id FROM doctor_slots WHERE doctor_id = ? AND date = ? AND session_type = ? LIMIT 1',
      [doctorId, date, session_type]
    );
    if (existing.length > 0) {
      await conn.rollback();
      transactionStarted = false;
      conn.release();
      conn = null;
      return res.status(409).json({ message: `${session_type} availability already exists for this date` });
    }

    const [result] = await conn.query(
      `INSERT INTO doctor_slots (doctor_id, date, session_type, start_time, end_time, is_booked)
       VALUES (?, ?, ?, ?, ?, false)`,
      [doctorId, date, session_type, start_time, end_time]
    );
    await conn.commit();
    transactionStarted = false;
    conn.release();
    conn = null;

    res.status(201).json({
      message: `${session_type} availability added successfully.`,
      addedCount: result.affectedRows
    });
  } catch (error) {
    if (conn) {
      if (transactionStarted) await conn.rollback();
      conn.release();
    }
    console.error('Add doctor slots error:', error);
    res.status(500).json({ message: 'Server error adding slots. Double check time formatting.' });
  }
};

// @desc    Delete an unbooked time slot
// @route   DELETE /api/doctors/slots/:id
// @access  Private (Doctor only)
const deleteDoctorSlot = async (req, res) => {
  const slotId = req.params.id;
  const doctorId = req.user.profileId;

  try {
    // Verify the session belongs to this doctor and has no appointment history.
    const [slotRows] = await pool.query(
      'SELECT date, session_type FROM doctor_slots WHERE id = ? AND doctor_id = ?',
      [slotId, doctorId]
    );

    if (slotRows.length === 0) {
      return res.status(404).json({ message: 'Time slot not found' });
    }

    const [appointments] = await pool.query(
      `SELECT a.id FROM appointments a
       JOIN doctor_slots s ON s.id = a.slot_id
       WHERE s.doctor_id = ? AND s.date = ? AND s.session_type = ? LIMIT 1`,
      [doctorId, slotRows[0].date, slotRows[0].session_type]
    );
    if (appointments.length > 0) {
      return res.status(400).json({ message: 'Cannot delete a session with appointment history. Cancel appointments instead.' });
    }

    await pool.query(
      'DELETE FROM doctor_slots WHERE doctor_id = ? AND date = ? AND session_type = ?',
      [doctorId, slotRows[0].date, slotRows[0].session_type]
    );

    res.json({ message: 'Time slot deleted successfully' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ message: 'Server error deleting slot' });
  }
};

// @desc    View all booked appointments
// @route   GET /api/doctors/appointments
// @access  Private (Doctor only)
const getBookedAppointments = async (req, res) => {
  try {
    const doctorId = req.user.profileId;

    const [appointments] = await pool.query(
      `SELECT a.id as appointment_id, a.status, a.notes, a.prescription, s.date, s.session_type,
              s.start_time, s.end_time, q.queue_number, q.status AS queue_status,
              p.name as patient_name, p.phone as patient_phone, p.gender as patient_gender, p.dob as patient_dob
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN appointment_queues q ON q.appointment_id = a.id
       WHERE a.doctor_id = ?
       ORDER BY s.date DESC, q.sequence_number DESC`,
      [doctorId]
    );

    if (appointments.length > 0) {
      const appointmentIds = appointments.map(appointment => appointment.appointment_id);
      const [medications] = await pool.query(
        `SELECT id, appointment_id, name, dosage, frequency, times, start_date, end_date, instructions
         FROM medications WHERE appointment_id IN (?) ORDER BY id ASC`,
        [appointmentIds]
      );
      appointments.forEach(appointment => {
        appointment.medications = medications.filter(medication => medication.appointment_id === appointment.appointment_id);
      });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({ message: 'Server error retrieving appointments' });
  }
};

// @desc    Confirm a patient appointment
// @route   PUT /api/doctors/appointments/:id/confirm
// @access  Private (Doctor only)
const confirmAppointment = async (req, res) => {
  const appointmentId = req.params.id;
  const doctorId = req.user.profileId;

  try {
    const [appointmentRows] = await pool.query(
      `SELECT a.id, a.status, p.user_id
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.id = ? AND a.doctor_id = ?`,
      [appointmentId, doctorId]
    );

    if (appointmentRows.length === 0) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (appointmentRows[0].status !== 'booked') {
      return res.status(400).json({ message: `Appointment cannot be confirmed because it is ${appointmentRows[0].status}` });
    }

    await pool.query("UPDATE appointments SET status = 'confirmed' WHERE id = ?", [appointmentId]);
    await createNotification(
      appointmentRows[0].user_id,
      'Appointment Confirmed',
      'Your doctor confirmed your appointment.',
      'appointment'
    );

    res.json({ message: 'Appointment confirmed successfully' });
  } catch (error) {
    console.error('Confirm appointment error:', error);
    res.status(500).json({ message: 'Server error confirming appointment' });
  }
};

// @desc    Complete consultation and add notes & prescription
// @route   PUT /api/doctors/appointments/:id/complete
// @access  Private (Doctor only)
const completeAppointmentWithPrescription = async (req, res) => {
  const appointmentId = req.params.id;
  const doctorId = req.user.profileId;
  const { notes, prescription, medications = [] } = req.body;

  if (!Array.isArray(medications)) {
    return res.status(400).json({ message: 'Medications must be provided as a list' });
  }
  for (const medication of medications) {
    if (!medication.name || !medication.dosage || !medication.frequency || !medication.times || !medication.start_date || !medication.end_date) {
      return res.status(400).json({ message: 'Each medication requires a name, dosage, frequency, time, start date, and end date' });
    }
    if (medication.end_date < medication.start_date) {
      return res.status(400).json({ message: `End date cannot be before start date for ${medication.name}` });
    }
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const [appRows] = await conn.query(
      `SELECT a.id, a.patient_id, p.user_id, d.name as doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = ? AND a.doctor_id = ?`,
      [appointmentId, doctorId]
    );

    if (appRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const app = appRows[0];

    // Update appointment
    await conn.query(
      `UPDATE appointments 
       SET status = 'completed', notes = ?, prescription = ? 
       WHERE id = ?`,
      [notes || null, prescription || null, appointmentId]
    );

    // Update queue status if present
    await conn.query(
      `UPDATE appointment_queues SET status = 'Completed' WHERE appointment_id = ?`,
      [appointmentId]
    );

    const [existingMedications] = await conn.query(
      'SELECT id FROM medications WHERE appointment_id = ? AND patient_id = ?',
      [appointmentId, app.patient_id]
    );
    const existingMedicationIds = existingMedications.map(medication => Number(medication.id));
    const submittedIds = medications.map(medication => Number(medication.id)).filter(Boolean);
    if (submittedIds.some(id => !existingMedicationIds.includes(id))) {
      throw new Error('A prescription item does not belong to this appointment');
    }
    for (const medication of medications) {
      const values = [
        app.patient_id,
        doctorId,
        appointmentId,
        medication.name.trim(),
        medication.dosage.trim(),
        medication.frequency.trim(),
        Array.isArray(medication.times) ? medication.times.join(', ') : medication.times.trim(),
        medication.start_date,
        medication.end_date,
        medication.instructions || ''
      ];

      if (medication.id) {
        await conn.query(
          `UPDATE medications SET name = ?, dosage = ?, frequency = ?, times = ?, start_date = ?, end_date = ?, instructions = ?, status = 'active'
           WHERE id = ? AND appointment_id = ? AND patient_id = ? AND doctor_id = ?`,
          [
            medication.name.trim(), medication.dosage.trim(), medication.frequency.trim(),
            Array.isArray(medication.times) ? medication.times.join(', ') : medication.times.trim(),
            medication.start_date, medication.end_date, medication.instructions || '',
            medication.id, appointmentId, app.patient_id, doctorId
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO medications
           (patient_id, doctor_id, appointment_id, name, dosage, frequency, times, start_date, end_date, instructions, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          values
        );
      }
    }

    const removedIds = existingMedications.map(medication => medication.id).filter(id => !submittedIds.includes(id));
    if (removedIds.length > 0) {
      await conn.query(
        `UPDATE medications SET status = 'completed' WHERE id IN (?) AND appointment_id = ? AND patient_id = ?`,
        [removedIds, appointmentId, app.patient_id]
      );
    }

    await conn.commit();
    conn.release();

    // Send notification to patient
    const { createNotification } = require('./notificationController');
    await createNotification(
      app.user_id,
      'Consultation Completed',
      `Dr. ${app.doctor_name} has completed your consultation and added prescription/notes.`,
      'appointment'
    );

    res.json({ message: 'Consultation completed and prescription recorded successfully' });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Complete appointment error:', error);
    res.status(500).json({ message: 'Server error completing appointment' });
  }
};

module.exports = {
  getDoctorDashboard,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorSlots,
  addDoctorSlots,
  deleteDoctorSlot,
  getBookedAppointments,
  confirmAppointment,
  completeAppointmentWithPrescription
};
