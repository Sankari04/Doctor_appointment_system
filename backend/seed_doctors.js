const pool = require('./config/db');
const bcrypt = require('bcryptjs');

const doctorsData = [
  {
    name: 'Dr. Aaron Vance',
    email: 'aaron.vance@docbook.com',
    phone: '9876543210',
    specialization: 'Cardiology',
    experience: 12,
    fee: 650.00,
    bio: 'Qualification: MBBS, MD, DM (Cardiology) | Clinic: Heart Vascular Center | Location: Downtown Clinic, Floor 3\nBio: Dr. Aaron Vance is a board-certified cardiologist with over a decade of clinical experience in managing coronary artery disease, heart failure, and hypertension.'
  },
  {
    name: 'Dr. Beatrice Lane',
    email: 'beatrice.lane@docbook.com',
    phone: '9876543211',
    specialization: 'Dermatology',
    experience: 8,
    fee: 500.00,
    bio: 'Qualification: MBBS, DDVL | Clinic: ClearSkin Clinic | Location: Westside Plaza, Suite A\nBio: Specialized in medical and cosmetic dermatology. Experienced in treating acne, eczema, psoriasis, and performing laser therapies.'
  },
  {
    name: 'Dr. Charles Young',
    email: 'charles.young@docbook.com',
    phone: '9876543212',
    specialization: 'General Medicine',
    experience: 15,
    fee: 400.00,
    bio: 'Qualification: MBBS, MD (Internal Medicine) | Clinic: Community Health Center | Location: North Medical Hub\nBio: Dr. Charles is dedicated to primary care, preventive screenings, and management of chronic diseases like diabetes and asthma.'
  },
  {
    name: 'Dr. Diana Prince',
    email: 'diana.prince@docbook.com',
    phone: '9876543213',
    specialization: 'Pediatrics',
    experience: 10,
    fee: 450.00,
    bio: 'Qualification: MBBS, MD (Pediatrics) | Clinic: KidCare Clinic | Location: Childrens Wing, General Hospital\nBio: Providing compassionate healthcare for children, infants, and adolescents, including developmental assessments and vaccinations.'
  },
  {
    name: 'Dr. Ethan Hunt',
    email: 'ethan.hunt@docbook.com',
    phone: '9876543214',
    specialization: 'Orthopedics',
    experience: 14,
    fee: 600.00,
    bio: 'Qualification: MBBS, MS (Orthopedics) | Clinic: Bone Joint Institute | Location: South Spine Wing\nBio: Expert in treating bone fractures, joint replacements, sports injuries, and arthritis management.'
  },
  {
    name: 'Dr. Fiona Gallagher',
    email: 'fiona.gallagher@docbook.com',
    phone: '9876543215',
    specialization: 'Neurology',
    experience: 11,
    fee: 700.00,
    bio: 'Qualification: MBBS, MD, DM (Neurology) | Clinic: NeuroCare Center | Location: Central Diagnostic Plaza\nBio: Specialized in managing neurological disorders such as stroke, epilepsy, migraines, neuropathies, and sleep disorders.'
  },
  {
    name: 'Dr. George Clark',
    email: 'george.clark@docbook.com',
    phone: '9876543216',
    specialization: 'Gynecology',
    experience: 9,
    fee: 550.00,
    bio: 'Qualification: MBBS, MS (OBGYN) | Clinic: Women Care Maternity Home | Location: East Wing, City Clinic\nBio: Focused on prenatal care, gynecological health, infertility treatments, and gynecological surgeries.'
  },
  {
    name: 'Dr. Hannah Baker',
    email: 'hannah.baker@docbook.com',
    phone: '9876543217',
    specialization: 'ENT',
    experience: 7,
    fee: 420.00,
    bio: 'Qualification: MBBS, DLO (ENT) | Clinic: ENT Specialists Clinic | Location: Parkway Complex, Suite 12\nBio: Treats ear, nose, throat, and head & neck disorders in adults and children, specializing in sinus issues.'
  },
  {
    name: 'Dr. Ian Malcolm',
    email: 'ian.malcolm@docbook.com',
    phone: '9876543218',
    specialization: 'Ophthalmology',
    experience: 16,
    fee: 480.00,
    bio: 'Qualification: MBBS, MS (Ophthalmology) | Clinic: Vision Eye Hospital | Location: Metro Galleria, Block B\nBio: Experienced in diagnostic examinations, cataract surgeries, laser vision correction, and glaucoma management.'
  },
  {
    name: 'Dr. Julia Roberts',
    email: 'julia.roberts@docbook.com',
    phone: '9876543219',
    specialization: 'Psychiatry',
    experience: 13,
    fee: 650.00,
    bio: 'Qualification: MBBS, MD (Psychiatry) | Clinic: Mind Health Clinic | Location: Serene Heights Center\nBio: Offering evaluation and therapy for anxiety disorders, depression, OCD, bipolar disorder, and stress management.'
  }
];

async function seedDoctors() {
  console.log('Seeding 10 doctors...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Get all specializations
    const [specializations] = await conn.query('SELECT * FROM specializations');
    const specMap = {};
    specializations.forEach(s => {
      specMap[s.name.toLowerCase()] = s.id;
    });

    const passwordHash = await bcrypt.hash('doctor123', 10);

    for (const d of doctorsData) {
      const specId = specMap[d.specialization.toLowerCase()];
      if (!specId) {
        console.error(`Specialization ${d.specialization} not found, skipping ${d.name}`);
        continue;
      }

      // Check if user already exists
      const [existingUsers] = await conn.query('SELECT id FROM users WHERE email = ?', [d.email]);
      let userId;

      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        // Delete existing doctor record (cascading slots will follow)
        const [existingDocs] = await conn.query('SELECT id FROM doctors WHERE user_id = ?', [userId]);
        if (existingDocs.length > 0) {
          await conn.query('DELETE FROM doctor_slots WHERE doctor_id = ?', [existingDocs[0].id]);
          await conn.query('DELETE FROM doctors WHERE id = ?', [existingDocs[0].id]);
        }
      } else {
        // Create user
        const [userResult] = await conn.query(
          'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
          [d.email, passwordHash, 'doctor']
        );
        userId = userResult.insertId;
      }

      // Create doctor profile (verified = 1 / true)
      const [docResult] = await conn.query(
        'INSERT INTO doctors (user_id, specialization_id, name, phone, bio, experience, consultation_fee, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, specId, d.name, d.phone, d.bio, d.experience, d.fee, 1]
      );
      const doctorId = docResult.insertId;

      // 2. Add availability slots for the next 4 days
      const slotsToCreate = [];
      const times = [
        { start: '10:00:00', end: '10:30:00' },
        { start: '11:00:00', end: '11:30:00' },
        { start: '14:00:00', end: '14:30:00' },
        { start: '15:30:00', end: '16:00:00' }
      ];

      for (let i = 0; i < 4; i++) {
        const dDate = new Date();
        dDate.setDate(dDate.getDate() + i);
        const dateStr = dDate.toISOString().split('T')[0];

        times.forEach(t => {
          slotsToCreate.push([doctorId, dateStr, t.start, t.end, 0]);
        });
      }

      await conn.query(
        'INSERT IGNORE INTO doctor_slots (doctor_id, date, start_time, end_time, is_booked) VALUES ?',
        [slotsToCreate]
      );
      console.log(`Seeded ${d.name} (${d.specialization}) with ${slotsToCreate.length} slots.`);
    }

    await conn.commit();
    console.log('Successfully completed seeding all 10 doctors!');
  } catch (error) {
    await conn.rollback();
    console.error('Seeding doctors failed:', error);
  } finally {
    conn.release();
    process.exit();
  }
}

seedDoctors();
