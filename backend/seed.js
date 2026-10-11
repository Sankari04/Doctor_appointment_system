const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Starting database seeding...');
  const conn = await pool.getConnection();
  try {
    // 1. Seed Specializations
    console.log('Seeding specializations...');
    const specializations = [
      ['General Medicine', 'Primary care, physical exams, and general health advice'],
      ['Cardiology', 'Diagnosis and treatment of heart and blood vessel disorders'],
      ['Pediatrics', 'Medical care for infants, children, and adolescents'],
      ['Dermatology', 'Treatment of skin, hair, and nail disorders'],
      ['Orthopedics', 'Treatment of musculoskeletal system, bones, and joints'],
      ['Neurology', 'Diagnosis and treatment of nervous system disorders']
    ];

    await conn.query('DELETE FROM appointments');
    await conn.query('DELETE FROM doctor_slots');
    await conn.query('DELETE FROM doctors');
    await conn.query('DELETE FROM patients');
    await conn.query('DELETE FROM users');
    await conn.query('DELETE FROM specializations');

    const [specInsertResult] = await conn.query(
      'INSERT INTO specializations (name, description) VALUES ?',
      [specializations]
    );
    console.log(`Seeded ${specInsertResult.affectedRows} specializations.`);

    // Get specialization IDs
    const [specRows] = await conn.query('SELECT id, name FROM specializations');
    const specMap = {};
    specRows.forEach(row => {
      specMap[row.name] = row.id;
    });

    // 2. Hash Passwords
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const patientPasswordHash = await bcrypt.hash('patient123', 10);
    const doctorPasswordHash = await bcrypt.hash('doctor123', 10);

    // 3. Seed Users
    console.log('Seeding users...');
    const users = [
      ['admin@app.com', adminPasswordHash, 'admin'],
      ['patient@app.com', patientPasswordHash, 'patient'],
      ['doctor1@app.com', doctorPasswordHash, 'doctor'],
      ['doctor2@app.com', doctorPasswordHash, 'doctor']
    ];

    const insertedUsers = [];
    for (const u of users) {
      const [result] = await conn.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        u
      );
      insertedUsers.push({ id: result.insertId, email: u[0], role: u[2] });
    }
    console.log(`Seeded ${insertedUsers.length} users.`);

    const adminUser = insertedUsers.find(u => u.role === 'admin');
    const patientUser = insertedUsers.find(u => u.role === 'patient');
    const doctor1User = insertedUsers.find(u => u.email === 'doctor1@app.com');
    const doctor2User = insertedUsers.find(u => u.email === 'doctor2@app.com');

    // 4. Seed Patient profile
    console.log('Seeding patient profile...');
    await conn.query(
      'INSERT INTO patients (user_id, name, phone, gender, dob) VALUES (?, ?, ?, ?, ?)',
      [patientUser.id, 'John Doe', '1234567890', 'Male', '1990-05-15']
    );

    // 5. Seed Doctor profiles
    console.log('Seeding doctor profiles...');
    // Dr. Sarah Smith (Cardiologist, Verified)
    await conn.query(
      `INSERT INTO doctors (user_id, specialization_id, name, phone, bio, experience, consultation_fee, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doctor1User.id,
        specMap['Cardiology'],
        'Dr. Sarah Smith',
        '9876543210',
        'Experienced Cardiologist specialized in heart failure, hypertension, and cardiovascular diseases.',
        10,
        500.00,
        true // Verified
      ]
    );

    // Dr. Alex Adams (Pediatrician, Unverified)
    await conn.query(
      `INSERT INTO doctors (user_id, specialization_id, name, phone, bio, experience, consultation_fee, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doctor2User.id,
        specMap['Pediatrics'],
        'Dr. Alex Adams',
        '9876543211',
        'Dedicated pediatrician focused on child healthcare, immunizations, and general developmental health.',
        5,
        400.00,
        false // Unverified (needs admin approval)
      ]
    );

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    conn.release();
    process.exit();
  }
}

seed();
