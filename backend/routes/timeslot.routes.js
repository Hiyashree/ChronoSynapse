const express = require('express');
const router = express.Router();
const { getTimeslots, getTimeslot, createTimeslot, updateTimeslot, deleteTimeslot } = require('../controllers/timeslot.controller');

router.get('/:schoolId', getTimeslots);
router.get('/:schoolId/:timeslotId', getTimeslot);
router.post('/:schoolId', createTimeslot);
router.put('/:schoolId/:timeslotId', updateTimeslot);
router.delete('/:schoolId/:timeslotId', deleteTimeslot);

module.exports = router;

