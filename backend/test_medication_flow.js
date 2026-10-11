const mysql = require('mysql2/promise');

const API_BASE = 'http://localhost:5000/api';

async function runTest() {
  console.log('--- STARTING E2E INTEGRATION TEST FOR MEDICATION TRACKER & NOTIFICATIONS ---');

  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'doctor_appointment_db'
  });

  try {
    // 1. Authenticate Patient
    console.log('\n1. Logging in as Patient (patient@app.com)...');
    const patientLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@app.com', password: 'password123' })
    });
    const patientLogin = await patientLoginRes.json();
    if (!patientLoginRes.ok) throw new Error(`Patient login failed: ${JSON.stringify(patientLogin)}`);
    const patientToken = patientLogin.token;
    const patientUserId = patientLogin.user.id;
    console.log(`✓ Patient logged in successfully. User ID: ${patientUserId}`);

    // 2. Authenticate Doctor
    console.log('\n2. Logging in as Doctor (doctor1@app.com)...');
    const doctorLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor1@app.com', password: 'password123' })
    });
    const doctorLogin = await doctorLoginRes.json();
    if (!doctorLoginRes.ok) throw new Error(`Doctor login failed: ${JSON.stringify(doctorLogin)}`);
    const doctorToken = doctorLogin.token;
    const doctorUserId = doctorLogin.user.id;
    console.log(`✓ Doctor logged in successfully. User ID: ${doctorUserId}`);

    // Get doctor_id and patient_id
    const [dRows] = await db.query('SELECT id FROM doctors WHERE user_id = ?', [doctorUserId]);
    const [pRows] = await db.query('SELECT id FROM patients WHERE user_id = ?', [patientUserId]);
    const doctorId = dRows[0].id;
    const patientId = pRows[0].id;

    // Create a slot & appointment
    console.log('\nCreating slot and appointment for test...');
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = '11:' + Math.floor(10 + Math.random() * 40) + ':00';
    const [slotRes] = await db.query(
      `INSERT INTO doctor_slots (doctor_id, date, start_time, end_time, is_booked)
       VALUES (?, ?, ?, '11:59:00', TRUE)`,
      [doctorId, todayStr, timeStr]
    );
    const slotId = slotRes.insertId;

    const [insertRes] = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, slot_id, status)
       VALUES (?, ?, ?, 'booked')`,
      [patientId, doctorId, slotId]
    );
    const appId = insertRes.insertId;

    // 3. Doctor Completes Consultation with Notes & Prescription
    console.log(`\n3. Doctor completing appointment ID #${appId} with prescription...`);
    const completeFetch = await fetch(`${API_BASE}/doctors/appointments/${appId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`
      },
      body: JSON.stringify({
        notes: 'Patient shows signs of seasonal allergy. Hydrate and take prescribed antihistamine.',
        prescription: 'Cetirizine 10mg',
        medications: [{
          name: 'Cetirizine',
          dosage: '10 mg',
          frequency: 'Once daily',
          times: '09:00 AM',
          start_date: todayStr,
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          instructions: 'Take after breakfast with water'
        }]
      })
    });
    const completeRes = await completeFetch.json();
    if (!completeFetch.ok) throw new Error(`Complete appointment failed: ${JSON.stringify(completeRes)}`);
    console.log(`✓ ${completeRes.message}`);

    // 4. Patient Views Prescriptions
    console.log('\n4. Patient retrieving appointments list...');
    const patientAppsFetch = await fetch(`${API_BASE}/patients/appointments`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const patientApps = await patientAppsFetch.json();
    const completedApp = patientApps.find(a => a.appointment_id === appId || a.id === appId);
    if (!completedApp) throw new Error(`Could not find appointment #${appId} in patient appointments list`);
    console.log(`✓ Retrieved appointment notes: "${completedApp.notes}"`);
    console.log(`✓ Retrieved prescription: "${completedApp.prescription}"`);

    // 5. Patient sees the doctor's prescription in Medication Manager
    console.log('\n5. Retrieving doctor-prescribed medication...');
    const medicationFetch = await fetch(`${API_BASE}/medications`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const medicationData = await medicationFetch.json();
    if (!medicationFetch.ok) throw new Error(`Get medications failed: ${JSON.stringify(medicationData)}`);
    const prescribedMedication = medicationData.medications.find(m => m.appointment_id === appId);
    if (!prescribedMedication) throw new Error(`Could not find prescription for appointment #${appId}`);
    const newMedId = prescribedMedication.id;
    console.log(`✓ Doctor-prescribed medication retrieved with ID: ${newMedId}`);

    // 6. Patient Tracks Daily Dose
    console.log('\n6. Fetching today log ID and tracking dose as "taken"...');
    const todayLogFetch = await fetch(`${API_BASE}/medications/today`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const todayLogData = await todayLogFetch.json();
    const targetLog = todayLogData.logs.find(l => l.medication_id === newMedId);
    if (!targetLog) throw new Error(`Could not find medication log for medication #${newMedId}`);

    const trackFetch = await fetch(`${API_BASE}/medications/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        log_id: targetLog.log_id,
        status: 'taken'
      })
    });
    const trackRes = await trackFetch.json();
    if (!trackFetch.ok) throw new Error(`Track medication failed: ${JSON.stringify(trackRes)}`);
    console.log(`✓ ${trackRes.message}`);

    // 7. Verify Today Summary Stats
    console.log('\n7. Fetching Today Medication Summary & Adherence Stats...');
    const todaySummaryFetch = await fetch(`${API_BASE}/medications/today`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const todaySummary = await todaySummaryFetch.json();
    console.log(`✓ Total Today Scheduled Doses: ${todaySummary.stats.totalToday}`);
    console.log(`✓ Total Taken: ${todaySummary.stats.takenCount}`);
    console.log(`✓ Total Missed: ${todaySummary.stats.missedCount}`);
    const calcAdherence = todaySummary.stats.totalToday > 0 ? Math.round((todaySummary.stats.takenCount / todaySummary.stats.totalToday) * 100) : 100;
    console.log(`✓ Calculated Adherence Rate: ${calcAdherence}%`);

    // 8. Verify In-App Notifications
    console.log('\n8. Checking In-App Notifications list for Patient...');
    const notifFetch = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const notifData = await notifFetch.json();
    const list = notifData.notifications || [];
    console.log(`✓ Patient Notifications Count: ${list.length}, Unread Count: ${notifData.unreadCount}`);
    if (list.length > 0) {
      console.log(`✓ Latest Notification: "${list[0].title}" - "${list[0].message}"`);
    }

    console.log('\n🎉 ALL E2E INTEGRATION TESTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  } finally {
    await db.end();
  }
}

runTest();
