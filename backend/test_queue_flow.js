const API_URL = 'http://localhost:5000/api';

async function runQueueTest() {
  console.log('--- STARTING SESSION QUEUE MODULE INTEGRATION TEST ---');

  try {
    // 1. Login as patient
    const patientLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@app.com', password: 'patient123' })
    });
    const patientData = await patientLoginRes.json();
    if (!patientLoginRes.ok) throw new Error(patientData.message);
    const patientToken = patientData.token;
    console.log('✓ Patient login successful');

    // 2. Login as doctor
    const doctorLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor1@app.com', password: 'doctor123' })
    });
    const doctorData = await doctorLoginRes.json();
    if (!doctorLoginRes.ok) throw new Error(doctorData.message);
    const doctorToken = doctorData.token;
    console.log('✓ Doctor login successful');

    // 3. Get doctor profile and available slots
    const doctorProfileRes = await fetch(`${API_URL}/patients/doctors/${doctorData.user.profileId}`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const profileData = await doctorProfileRes.json();
    const slots = profileData.slots;

    const morningSlot = slots.find(s => parseInt(s.start_time.split(':')[0], 10) < 12);
    const eveningSlot = slots.find(s => parseInt(s.start_time.split(':')[0], 10) >= 12);

    if (morningSlot) {
      console.log(`✓ Found Morning slot: ID ${morningSlot.id} at ${morningSlot.start_time}`);
      const bookMorningRes = await fetch(`${API_URL}/patients/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
        body: JSON.stringify({ doctor_id: profileData.doctor.id, slot_id: morningSlot.id })
      });
      const bookMorningData = await bookMorningRes.json();
      console.log('  Morning Queue Ticket:', bookMorningData.queueNumber, `(Session: ${bookMorningData.sessionType})`);
      if (!bookMorningData.queueNumber.startsWith('M')) {
        throw new Error('Morning token prefix error!');
      }
    }

    if (eveningSlot) {
      console.log(`✓ Found Evening slot: ID ${eveningSlot.id} at ${eveningSlot.start_time}`);
      const bookEveningRes = await fetch(`${API_URL}/patients/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${patientToken}` },
        body: JSON.stringify({ doctor_id: profileData.doctor.id, slot_id: eveningSlot.id })
      });
      const bookEveningData = await bookEveningRes.json();
      console.log('  Evening Queue Ticket:', bookEveningData.queueNumber, `(Session: ${bookEveningData.sessionType})`);
      if (!bookEveningData.queueNumber.startsWith('E')) {
        throw new Error('Evening token prefix error!');
      }
    }

    // 4. Check Patient Live Queue status
    const patientQueueRes = await fetch(`${API_URL}/queue/patient`, {
      headers: { Authorization: `Bearer ${patientToken}` }
    });
    const patientQueueData = await patientQueueRes.json();
    console.log('✓ Patient Queue Status:');
    console.log('  Active Ticket:', patientQueueData.activeQueue?.queue_number);
    console.log('  Session:', patientQueueData.activeQueue?.session_type);
    console.log('  Patients Ahead in Session:', patientQueueData.activeQueue?.patientsAhead);

    // 5. Check Doctor Queue status
    const doctorQueueRes = await fetch(`${API_URL}/queue/doctor`, {
      headers: { Authorization: `Bearer ${doctorToken}` }
    });
    const doctorQueueData = await doctorQueueRes.json();
    console.log('✓ Doctor Queue Dashboard:');
    console.log('  Morning Queue Count:', doctorQueueData.stats.morning.totalCount);
    console.log('  Evening Queue Count:', doctorQueueData.stats.evening.totalCount);

    console.log('\n=============================================');
    console.log('🎉 SESSION-BASED QUEUE TEST PASSED SUCCESSFULLY!');
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Session Queue Test Failed:', error.message);
    process.exit(1);
  }
}

runQueueTest();
