const pool = require('../config/db');

// Helper to ensure all appointments have a queue record with proper session_type
const syncMissingQueues = async (connOrPool = pool) => {
  try {
    const [missingAppointments] = await connOrPool.query(
      `SELECT a.id as appointment_id, a.patient_id, a.doctor_id, a.status as app_status, s.date, s.start_time
       FROM appointments a
       JOIN doctor_slots s ON a.slot_id = s.id
       LEFT JOIN appointment_queues q ON a.id = q.appointment_id
       WHERE q.id IS NULL
       ORDER BY a.id ASC`
    );

    for (const app of missingAppointments) {
      const startHour = parseInt(String(app.start_time).split(':')[0], 10);
      const sessionType = startHour < 12 ? 'Morning' : 'Evening';
      const prefix = sessionType === 'Morning' ? 'M' : 'E';

      const [seqResult] = await connOrPool.query(
        `SELECT COALESCE(MAX(sequence_number), 0) as max_seq 
         FROM appointment_queues 
         WHERE doctor_id = ? AND date = ? AND session_type = ?`,
        [app.doctor_id, app.date, sessionType]
      );
      const nextSeq = (seqResult[0].max_seq || 0) + 1;
      const queueNumber = `${prefix}${String(nextSeq).padStart(2, '0')}`;
      const queueStatus = app.app_status === 'cancelled' ? 'Cancelled' : (app.app_status === 'completed' ? 'Completed' : 'Waiting');

      await connOrPool.query(
        `INSERT IGNORE INTO appointment_queues 
         (appointment_id, doctor_id, patient_id, date, session_type, queue_number, sequence_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [app.appointment_id, app.doctor_id, app.patient_id, app.date, sessionType, queueNumber, nextSeq, queueStatus]
      );
    }
  } catch (err) {
    console.error('Error syncing missing queues:', err);
  }
};

// @desc    Get patient's queue status and position (session isolated)
// @route   GET /api/queue/patient
// @access  Private (Patient only)
const getPatientQueueStatus = async (req, res) => {
  try {
    await syncMissingQueues();
    const patientId = req.user.profileId;

    // Get all queue tickets for patient
    const [myQueues] = await pool.query(
      `SELECT q.id as queue_id, q.appointment_id, q.doctor_id, q.date, q.session_type, q.queue_number, 
              q.sequence_number, q.status as queue_status,
              d.name as doctor_name, sp.name as specialization_name,
              s.start_time, s.end_time
       FROM appointment_queues q
       JOIN doctors d ON q.doctor_id = d.id
       JOIN specializations sp ON d.specialization_id = sp.id
       JOIN appointments a ON q.appointment_id = a.id
       JOIN doctor_slots s ON a.slot_id = s.id
       WHERE q.patient_id = ?
       ORDER BY q.date DESC, s.start_time ASC`,
      [patientId]
    );

    if (myQueues.length === 0) {
      return res.json({ activeQueue: null, queueHistory: [] });
    }

    // Enrich each ticket with session-specific live metrics
    const enrichedQueues = await Promise.all(
      myQueues.map(async (item) => {
        // Find current consulting ticket in the same session
        const [consultingResult] = await pool.query(
          `SELECT queue_number FROM appointment_queues 
           WHERE doctor_id = ? AND date = ? AND session_type = ? AND status = 'Consulting' 
           LIMIT 1`,
          [item.doctor_id, item.date, item.session_type]
        );
        const currentConsultingQueueNumber = consultingResult.length > 0 ? consultingResult[0].queue_number : 'None';

        // Count patients ahead in the same session with status 'Waiting'
        const [aheadResult] = await pool.query(
          `SELECT COUNT(*) as ahead_count FROM appointment_queues 
           WHERE doctor_id = ? AND date = ? AND session_type = ? AND status = 'Waiting' AND sequence_number < ?`,
          [item.doctor_id, item.date, item.session_type, item.sequence_number]
        );
        const patientsAhead = aheadResult[0].ahead_count || 0;
        const estimatedWaitTimeMins = item.queue_status === 'Waiting' ? patientsAhead * 15 : 0;

        return {
          ...item,
          currentConsultingQueueNumber,
          patientsAhead,
          estimatedWaitTimeMins
        };
      })
    );

    const activeQueue = enrichedQueues.find(q => q.queue_status === 'Waiting' || q.queue_status === 'Consulting') || enrichedQueues[0];

    res.json({
      activeQueue,
      queueHistory: enrichedQueues
    });
  } catch (error) {
    console.error('Get patient queue error:', error);
    res.status(500).json({ message: 'Server error retrieving queue status' });
  }
};

// @desc    Get doctor's queue for a date, split by Morning & Evening sessions
// @route   GET /api/queue/doctor
// @access  Private (Doctor only)
const getDoctorQueue = async (req, res) => {
  try {
    await syncMissingQueues();
    const doctorId = req.user.profileId;
    const requestedDate = req.query.date || new Date().toISOString().split('T')[0];

    const [queueRows] = await pool.query(
      `SELECT q.id as queue_id, q.appointment_id, q.patient_id, q.date, q.session_type, q.queue_number,
              q.sequence_number, q.status as queue_status, q.created_at,
              p.name as patient_name, p.phone as patient_phone, p.gender as patient_gender, p.dob as patient_dob,
              s.start_time, s.end_time
       FROM appointment_queues q
       JOIN patients p ON q.patient_id = p.id
       JOIN appointments a ON q.appointment_id = a.id
       JOIN doctor_slots s ON a.slot_id = s.id
       WHERE q.doctor_id = ? AND q.date = ?
       ORDER BY q.session_type DESC, q.sequence_number ASC`,
      [doctorId, requestedDate]
    );

    const morningQueue = queueRows.filter(item => item.session_type === 'Morning');
    const eveningQueue = queueRows.filter(item => item.session_type === 'Evening');

    const getSessionStats = (list) => ({
      currentlyConsulting: list.find(i => i.queue_status === 'Consulting') || null,
      waitingCount: list.filter(i => i.queue_status === 'Waiting').length,
      completedCount: list.filter(i => i.queue_status === 'Completed').length,
      cancelledCount: list.filter(i => i.queue_status === 'Cancelled').length,
      totalCount: list.length
    });

    res.json({
      date: requestedDate,
      queue: queueRows,
      morningQueue,
      eveningQueue,
      stats: {
        morning: getSessionStats(morningQueue),
        evening: getSessionStats(eveningQueue),
        totalCount: queueRows.length
      }
    });
  } catch (error) {
    console.error('Get doctor queue error:', error);
    res.status(500).json({ message: 'Server error retrieving doctor queue' });
  }
};

// @desc    Call next patient in a specific session (Morning / Evening)
// @route   POST /api/queue/doctor/call-next
// @access  Private (Doctor only)
const callNextPatient = async (req, res) => {
  const doctorId = req.user.profileId;
  const requestedDate = req.body.date || new Date().toISOString().split('T')[0];
  
  // Default session logic: if current hour < 13 -> Morning, else Evening
  const currentHour = new Date().getHours();
  const sessionType = req.body.session_type || (currentHour < 13 ? 'Morning' : 'Evening');

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await syncMissingQueues(conn);

    // 1. Mark currently 'Consulting' patient in this session as 'Completed'
    await conn.query(
      `UPDATE appointment_queues 
       SET status = 'Completed' 
       WHERE doctor_id = ? AND date = ? AND session_type = ? AND status = 'Consulting'`,
      [doctorId, requestedDate, sessionType]
    );
    await conn.query(
      `UPDATE appointments a
       JOIN appointment_queues q ON a.id = q.appointment_id
       SET a.status = 'completed'
       WHERE q.doctor_id = ? AND q.date = ? AND q.session_type = ? AND q.status = 'Completed'`,
      [doctorId, requestedDate, sessionType]
    );

    // 2. Find next patient with status 'Waiting' in this session
    const [nextRows] = await conn.query(
      `SELECT q.id, q.appointment_id, q.queue_number, q.session_type, p.name as patient_name
       FROM appointment_queues q
       JOIN patients p ON q.patient_id = p.id
       WHERE q.doctor_id = ? AND q.date = ? AND q.session_type = ? AND q.status = 'Waiting'
       ORDER BY q.sequence_number ASC
       LIMIT 1`,
      [doctorId, requestedDate, sessionType]
    );

    if (nextRows.length === 0) {
      await conn.commit();
      conn.release();
      return res.json({ message: `No more waiting patients in ${sessionType} session.`, calledPatient: null });
    }

    const nextPatient = nextRows[0];

    // Update status to 'Consulting'
    await conn.query(
      `UPDATE appointment_queues SET status = 'Consulting' WHERE id = ?`,
      [nextPatient.id]
    );

    await conn.commit();
    conn.release();

    res.json({
      message: `Calling ${sessionType} patient ${nextPatient.patient_name} (Token ${nextPatient.queue_number})`,
      calledPatient: nextPatient
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Call next patient error:', error);
    res.status(500).json({ message: 'Server error advancing session queue' });
  }
};

// @desc    Update individual queue item status
// @route   PUT /api/queue/doctor/status/:queueId
// @access  Private (Doctor only)
const updateQueueStatus = async (req, res) => {
  const queueId = req.params.queueId;
  const { status } = req.body;
  const doctorId = req.user.profileId;

  const validStatuses = ['Waiting', 'Consulting', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [queueRows] = await conn.query(
      `SELECT * FROM appointment_queues WHERE id = ? AND doctor_id = ?`,
      [queueId, doctorId]
    );

    if (queueRows.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Queue item not found' });
    }

    const queueItem = queueRows[0];

    // If changing to Consulting, mark other currently consulting patient in the same session as Completed
    if (status === 'Consulting') {
      await conn.query(
        `UPDATE appointment_queues 
         SET status = 'Completed' 
         WHERE doctor_id = ? AND date = ? AND session_type = ? AND status = 'Consulting' AND id != ?`,
        [doctorId, queueItem.date, queueItem.session_type, queueId]
      );
    }

    // Update queue status
    await conn.query(
      `UPDATE appointment_queues SET status = ? WHERE id = ?`,
      [status, queueId]
    );

    // Sync appointment status if Completed or Cancelled
    if (status === 'Completed') {
      await conn.query(`UPDATE appointments SET status = 'completed' WHERE id = ?`, [queueItem.appointment_id]);
    } else if (status === 'Cancelled') {
      await conn.query(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [queueItem.appointment_id]);
    }

    await conn.commit();
    conn.release();

    res.json({ message: `Queue status updated to ${status}` });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Update queue status error:', error);
    res.status(500).json({ message: 'Server error updating queue status' });
  }
};

module.exports = {
  syncMissingQueues,
  getPatientQueueStatus,
  getDoctorQueue,
  callNextPatient,
  updateQueueStatus
};
