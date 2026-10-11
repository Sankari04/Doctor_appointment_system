const express = require('express');
const router = express.Router();
const {
  getDoctorDashboard,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorSlots,
  addDoctorSlots,
  deleteDoctorSlot,
  getBookedAppointments,
  confirmAppointment,
  completeAppointmentWithPrescription
} = require('../controllers/doctorController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All doctor routes are protected and restricted to doctors only
router.use(protect);
router.use(restrictTo('doctor'));

router.get('/dashboard', getDoctorDashboard);
router.get('/profile', getDoctorProfile);
router.put('/profile', updateDoctorProfile);
router.get('/slots', getDoctorSlots);
router.post('/slots', addDoctorSlots);
router.delete('/slots/:id', deleteDoctorSlot);
router.get('/appointments', getBookedAppointments);
router.put('/appointments/:id/confirm', confirmAppointment);
router.put('/appointments/:id/complete', completeAppointmentWithPrescription);

module.exports = router;
