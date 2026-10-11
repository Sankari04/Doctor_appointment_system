const pool = require('./config/db');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const testEmailPrefix = `queue-test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const testEmails = ['doctor', 0, 1, 2].map(index => `${testEmailPrefix}-${index}@example.invalid`);
let testDate;
let doctorId;

async function request(path, { method = 'GET', token, body, expectedStatus = 200 } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${path}: expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function registerTestPatient(email, index) {
  const result = await request('/auth/register', {
    method: 'POST',
    expectedStatus: 201,
    body: {
      email,
      password: 'QueueTest123!',
      role: 'patient',
      name: `Queue Test Patient ${index + 1}`,
      phone: `55501${String(Date.now() + index).slice(-5)}`,
      gender: 'Other',
      dob: '1990-01-01'
    }
  });
  return { token: result.token, profileId: result.user.profileId };
}

async function runQueueTest() {
  const patients = [];
  let doctorToken;

  try {
    const [specializations] = await pool.query('SELECT id FROM specializations ORDER BY id LIMIT 1');
    if (specializations.length === 0) throw new Error('The database needs at least one specialization for the test doctor');

    const doctorRegistration = await request('/auth/register', {
      method: 'POST',
      expectedStatus: 201,
      body: {
        email: testEmails[0],
        password: 'QueueTest123!',
        role: 'doctor',
        name: 'Queue Test Doctor',
        phone: `55502${String(Date.now()).slice(-5)}`,
        specialization_id: specializations[0].id,
        experience: 5,
        consultation_fee: 100
      }
    });
    doctorToken = doctorRegistration.token;
    doctorId = doctorRegistration.user.profileId;
    await pool.query('UPDATE doctors SET is_verified = true WHERE id = ?', [doctorId]);

    patients.push(...await Promise.all(testEmails.slice(1).map(registerTestPatient)));

    testDate = new Date();
    testDate.setUTCDate(testDate.getUTCDate() + 120 + (Date.now() % 180));
    const date = testDate.toISOString().slice(0, 10);

    for (const sessionType of ['Morning', 'Evening']) {
      const startTime = sessionType === 'Morning' ? '09:00:00' : '18:00:00';
      const endTime = sessionType === 'Morning' ? '12:00:00' : '21:00:00';
      await request('/doctors/slots', {
        method: 'POST',
        token: doctorToken,
        expectedStatus: 201,
        body: { date, session_type: sessionType, start_time: startTime, end_time: endTime }
      });
    }
    console.log('PASS: doctor can configure independent morning and evening sessions');

    const concurrentBookings = await Promise.all([
      request('/patients/appointments', {
        method: 'POST',
        token: patients[0].token,
        expectedStatus: 201,
        body: { doctor_id: doctorId, date, session_type: 'Morning' }
      }),
      request('/patients/appointments', {
        method: 'POST',
        token: patients[1].token,
        expectedStatus: 201,
        body: { doctor_id: doctorId, date, session_type: 'Morning' }
      })
    ]);
    const morningTokens = concurrentBookings.map(booking => Number(booking.queueNumber)).sort((a, b) => a - b);
    if (morningTokens[0] !== 1 || morningTokens[1] !== 2) {
      throw new Error(`Concurrent morning bookings should receive tokens 1 and 2; got ${morningTokens.join(', ')}`);
    }
    console.log('PASS: concurrent patients receive unique, sequential morning tokens');

    await request('/patients/appointments', {
      method: 'POST',
      token: patients[0].token,
      expectedStatus: 409,
      body: { doctor_id: doctorId, date, session_type: 'Morning' }
    });
    console.log('PASS: duplicate active booking by the same patient is rejected');

    const patientAppointments = await request('/patients/appointments', { token: patients[0].token });
    const firstMorningAppointment = patientAppointments.find(appointment =>
      appointment.date.toString().slice(0, 10) === date &&
      appointment.session_type === 'Morning' &&
      appointment.status === 'booked'
    );
    if (!firstMorningAppointment) throw new Error('Could not find the test patient’s morning booking to cancel');

    await request(`/patients/appointments/${firstMorningAppointment.appointment_id}/cancel`, {
      method: 'POST',
      token: patients[0].token
    });
    const rebooked = await request('/patients/appointments', {
      method: 'POST',
      token: patients[0].token,
      expectedStatus: 201,
      body: { doctor_id: doctorId, date, session_type: 'Morning' }
    });
    if (Number(rebooked.queueNumber) !== 3) {
      throw new Error(`A cancelled token must not be reused; expected token 3, got ${rebooked.queueNumber}`);
    }
    console.log('PASS: cancellation preserves token history and the next booking receives token 3');

    const eveningBooking = await request('/patients/appointments', {
      method: 'POST',
      token: patients[2].token,
      expectedStatus: 201,
      body: { doctor_id: doctorId, date, session_type: 'Evening' }
    });
    if (eveningBooking.queueNumber !== '1') {
      throw new Error(`Evening queue should start at token 1; got ${eveningBooking.queueNumber}`);
    }
    console.log('PASS: evening token numbering starts independently at 1');

    const queues = await request(`/queue/doctor?date=${date}`, { token: doctorToken });
    if (queues.morningQueue.length !== 3 || queues.eveningQueue.length !== 1) {
      throw new Error('Doctor queue did not keep morning and evening patients separate');
    }
    if (queues.morningQueue.map(item => Number(item.queue_number)).join(',') !== '1,2,3') {
      throw new Error('Doctor morning queue is not in token order');
    }
    console.log('PASS: doctor dashboard returns separate queues in token order');

    const calledPatient = await request('/queue/doctor/call-next', {
      method: 'POST',
      token: doctorToken,
      expectedStatus: 200,
      body: { date, session_type: 'Morning' }
    });
    if (Number(calledPatient.calledPatient.queue_number) !== 2) {
      throw new Error('Call next should skip the cancelled token and call the next waiting patient');
    }
    await request('/queue/doctor/call-next', {
      method: 'POST',
      token: doctorToken,
      expectedStatus: 409,
      body: { date, session_type: 'Morning' }
    });
    await request(`/queue/doctor/status/${calledPatient.calledPatient.id}`, {
      method: 'PUT',
      token: doctorToken,
      body: { status: 'Completed' }
    });
    const nextPatient = await request('/queue/doctor/call-next', {
      method: 'POST',
      token: doctorToken,
      expectedStatus: 200,
      body: { date, session_type: 'Morning' }
    });
    if (Number(nextPatient.calledPatient.queue_number) !== 3) {
      throw new Error('Call next did not advance to morning token 3 after completion');
    }
    console.log('PASS: consultation lifecycle requires completion before advancing the queue');

    const patientQueue = await request('/queue/patient', { token: patients[2].token });
    if (patientQueue.activeQueue.session_type !== 'Evening' || patientQueue.activeQueue.queue_number !== '1') {
      throw new Error('Patient queue does not show the correct date/session token');
    }
    console.log('PASS: patient dashboard shows the patient’s date, session, token, and queue status');
  } finally {
    await pool.query('DELETE FROM users WHERE email IN (?)', [testEmails]);
    if (doctorId && testDate) {
      await pool.query(
        'DELETE FROM doctor_slots WHERE doctor_id = ? AND date = ?',
        [doctorId, testDate.toISOString().slice(0, 10)]
      );
    }
    await pool.close();
  }
}

runQueueTest().catch(error => {
  console.error('Token-based queue integration test failed:', error.message);
  process.exitCode = 1;
});
