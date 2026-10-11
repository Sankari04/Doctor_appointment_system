const express = require('express');
const router = express.Router();
const {
  addMedication,
  getMedications,
  updateMedication,
  deleteMedication,
  getTodayMedications,
  trackMedication,
  getMedicationHistory
} = require('../controllers/medicationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);
router.use(restrictTo('patient'));

router.post('/', addMedication);
router.get('/', getMedications);
router.put('/:id', updateMedication);
router.delete('/:id', deleteMedication);

router.get('/today', getTodayMedications);
router.post('/track', trackMedication);
router.get('/history', getMedicationHistory);

module.exports = router;
