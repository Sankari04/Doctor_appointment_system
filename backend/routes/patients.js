const express = require('express');
const router = express.Router();
const {
  getPatientDashboard,
  searchDoctors,
  getDoctorProfile,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  deleteCompletedAppointment
} = require('../controllers/patientController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All patient routes are protected and restricted to patients only
router.use(protect);
router.use(restrictTo('patient'));

router.get('/dashboard', getPatientDashboard);
router.get('/doctors', searchDoctors);
router.get('/doctors/:id', getDoctorProfile);
router.post('/appointments', bookAppointment);
router.get('/appointments', getMyAppointments);
router.post('/appointments/:id/cancel', cancelAppointment);
router.delete('/appointments/:id', deleteCompletedAppointment);

module.exports = router;
