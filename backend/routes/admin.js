const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getAllDoctors,
  verifyDoctor,
  rejectDoctor,
  deleteDoctor
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All admin routes are protected and restricted to admins only
router.use(protect);
router.use(restrictTo('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/doctors', getAllDoctors);
router.put('/doctors/:id/verify', verifyDoctor);
router.put('/doctors/:id/reject', rejectDoctor);
router.delete('/doctors/:id', deleteDoctor);

module.exports = router;
