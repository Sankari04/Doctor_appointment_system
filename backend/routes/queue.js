const express = require('express');
const router = express.Router();
const {
  getPatientQueueStatus,
  getDoctorQueue,
  callNextPatient,
  updateQueueStatus
} = require('../controllers/queueController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Patient routes
router.get('/patient', protect, restrictTo('patient'), getPatientQueueStatus);

// Doctor routes
router.get('/doctor', protect, restrictTo('doctor'), getDoctorQueue);
router.post('/doctor/call-next', protect, restrictTo('doctor'), callNextPatient);
router.put('/doctor/status/:queueId', protect, restrictTo('doctor'), updateQueueStatus);

module.exports = router;
