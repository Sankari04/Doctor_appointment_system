const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// @desc    Add new medication
// @route   POST /api/medications
// @access  Private (Patient only)
const addMedication = async (req, res) => {
  res.status(403).json({ message: 'Medications must be prescribed by your doctor during a consultation.' });
};

// @desc    Get patient medications (active & completed)
// @route   GET /api/medications
// @access  Private (Patient only)
const getMedications = async (req, res) => {
  try {
    const patientId = req.user.profileId;

    const [medicationRows] = await pool.query(
      `SELECT m.*, d.name AS doctor_name,
              CASE
                WHEN m.status = 'completed' OR m.end_date < CURDATE() THEN 'completed'
                WHEN EXISTS (
                  SELECT 1 FROM medication_logs l
                  WHERE l.medication_id = m.id AND l.status = 'missed'
                ) THEN 'missed'
                ELSE 'active'
              END AS display_status
       FROM medications m
       LEFT JOIN doctors d ON d.id = m.doctor_id
       WHERE m.patient_id = ?
       ORDER BY m.start_date DESC, m.id DESC`,
      [patientId]
    );

    const medications = medicationRows.map(medication => ({
      ...medication,
      status: medication.display_status
    }));
    const active = medications.filter(m => m.status === 'active');
    const completed = medications.filter(m => m.status === 'completed');
    const missed = medications.filter(m => m.status === 'missed');

    res.json({
      medications,
      active,
      completed,
      missed
    });
  } catch (error) {
    console.error('Get medications error:', error);
    res.status(500).json({ message: 'Server error retrieving medications' });
  }
};

// @desc    Update medication
// @route   PUT /api/medications/:id
// @access  Private (Patient only)
const updateMedication = async (req, res) => {
  try {
    const medicationId = req.params.id;
    const patientId = req.user.profileId;
    const { name, dosage, frequency, times, start_date, end_date, instructions, status } = req.body;

    const formattedTimes = Array.isArray(times) ? times.join(', ') : (times || '09:00 AM');

    await pool.query(
      `UPDATE medications 
       SET name = ?, dosage = ?, frequency = ?, times = ?, start_date = ?, end_date = ?, instructions = ?, status = ?
       WHERE id = ? AND patient_id = ? AND appointment_id IS NULL`,
      [name, dosage, frequency, formattedTimes, start_date, end_date, instructions, status || 'active', medicationId, patientId]
    );

    const [updatedRows] = await pool.query(
      'SELECT id FROM medications WHERE id = ? AND patient_id = ? AND appointment_id IS NULL',
      [medicationId, patientId]
    );
    if (updatedRows.length === 0) {
      return res.status(403).json({ message: 'Doctor-prescribed medications can only be changed by the prescribing doctor.' });
    }

    res.json({ message: 'Medication updated successfully' });
  } catch (error) {
    console.error('Update medication error:', error);
    res.status(500).json({ message: 'Server error updating medication' });
  }
};

// @desc    Delete medication
// @route   DELETE /api/medications/:id
// @access  Private (Patient only)
const deleteMedication = async (req, res) => {
  try {
    const medicationId = req.params.id;
    const patientId = req.user.profileId;

    const [result] = await pool.query(
      'DELETE FROM medications WHERE id = ? AND patient_id = ? AND appointment_id IS NULL',
      [medicationId, patientId]
    );
    if (result.affectedRows === 0) {
      return res.status(403).json({ message: 'Doctor-prescribed medications cannot be deleted by patients.' });
    }

    res.json({ message: 'Medication deleted successfully' });
  } catch (error) {
    console.error('Delete medication error:', error);
    res.status(500).json({ message: 'Server error deleting medication' });
  }
};

// @desc    Get today's scheduled medications and tracking status
// @route   GET /api/medications/today
// @access  Private (Patient only)
const getTodayMedications = async (req, res) => {
  try {
    const patientId = req.user.profileId;
    const today = new Date().toISOString().split('T')[0];

    // Fetch active medications where today falls within start_date and end_date
    const [activeMeds] = await pool.query(
      `SELECT * FROM medications 
       WHERE patient_id = ? AND status = 'active' AND start_date <= ? AND end_date >= ?`,
      [patientId, today, today]
    );

    // For each active medication, split times and ensure tracking log exists
    for (const med of activeMeds) {
      const timesList = med.times ? med.times.split(',').map(t => t.trim()) : ['09:00 AM'];
      for (const scheduledTime of timesList) {
        await pool.query(
          `INSERT IGNORE INTO medication_logs (medication_id, patient_id, log_date, scheduled_time, status)
           VALUES (?, ?, ?, ?, 'pending')`,
          [med.id, patientId, today, scheduledTime]
        );
      }
    }

    // Retrieve today's logs with medication info
    const [todayLogs] = await pool.query(
            `SELECT l.id as log_id, l.medication_id, l.log_date, l.scheduled_time, l.status as tracking_status,
              m.name as medicine_name, m.dosage, m.frequency, m.instructions, m.start_date, m.end_date, d.name AS doctor_name
       FROM medication_logs l
       JOIN medications m ON l.medication_id = m.id
             LEFT JOIN doctors d ON d.id = m.doctor_id
       WHERE l.patient_id = ? AND l.log_date = ?
       ORDER BY l.scheduled_time ASC`,
      [patientId, today]
    );

    const totalToday = todayLogs.length;
    const takenCount = todayLogs.filter(l => l.tracking_status === 'taken').length;
    const missedCount = todayLogs.filter(l => l.tracking_status === 'missed').length;
    const remainingCount = todayLogs.filter(l => l.tracking_status === 'pending').length;

    res.json({
      today,
      logs: todayLogs,
      stats: {
        totalToday,
        takenCount,
        missedCount,
        remainingCount
      }
    });
  } catch (error) {
    console.error('Get today medications error:', error);
    res.status(500).json({ message: 'Server error retrieving today medications' });
  }
};

// @desc    Track medication dose status (taken/missed)
// @route   POST /api/medications/track
// @access  Private (Patient only)
const trackMedication = async (req, res) => {
  try {
    const patientId = req.user.profileId;
    const { log_id, status } = req.body;

    if (!log_id || !['taken', 'missed', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Valid log_id and status (taken/missed/pending) are required' });
    }

    await pool.query(
      `UPDATE medication_logs SET status = ? WHERE id = ? AND patient_id = ?`,
      [status, log_id, patientId]
    );

    // If marked missed, create a reminder notification
    if (status === 'missed') {
      const [logDetails] = await pool.query(
        `SELECT m.name, m.dosage FROM medication_logs l JOIN medications m ON l.medication_id = m.id WHERE l.id = ?`,
        [log_id]
      );
      if (logDetails.length > 0) {
        const [patientUser] = await pool.query('SELECT user_id FROM patients WHERE id = ?', [patientId]);
        if (patientUser.length > 0) {
          await createNotification(
            patientUser[0].user_id,
            'Medication Missed Alert',
            `You marked ${logDetails[0].name} (${logDetails[0].dosage}) as missed today. Remember to follow doctor guidelines.`,
            'medication'
          );
        }
      }
    }

    res.json({ message: `Medication status updated to ${status}` });
  } catch (error) {
    console.error('Track medication error:', error);
    res.status(500).json({ message: 'Server error tracking medication' });
  }
};

// @desc    Get medication tracking log history
// @route   GET /api/medications/history
// @access  Private (Patient only)
const getMedicationHistory = async (req, res) => {
  try {
    const patientId = req.user.profileId;

    const [history] = await pool.query(
            `SELECT l.id as log_id, l.log_date, l.scheduled_time, l.status as tracking_status,
              m.name as medicine_name, m.dosage, m.instructions, m.start_date, m.end_date, d.name AS doctor_name
       FROM medication_logs l
       JOIN medications m ON l.medication_id = m.id
             LEFT JOIN doctors d ON d.id = m.doctor_id
       WHERE l.patient_id = ?
       ORDER BY l.log_date DESC, l.scheduled_time ASC
       LIMIT 50`,
      [patientId]
    );

    res.json(history);
  } catch (error) {
    console.error('Get medication history error:', error);
    res.status(500).json({ message: 'Server error retrieving medication history' });
  }
};

module.exports = {
  addMedication,
  getMedications,
  updateMedication,
  deleteMedication,
  getTodayMedications,
  trackMedication,
  getMedicationHistory
};
