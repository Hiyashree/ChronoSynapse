const express = require('express');
const router = express.Router();
const { getTimetable, generateTimetable, deleteTimetable, getStatistics } = require('../controllers/timetable.controller');

router.get('/:schoolId/stats', getStatistics);
router.get('/:schoolId', getTimetable);
router.post('/:schoolId/generate', generateTimetable);
router.delete('/:schoolId', deleteTimetable);

module.exports = router;

