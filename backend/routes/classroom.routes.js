const express = require('express');
const router = express.Router();
const { getClassrooms, getClassroom, createClassroom, updateClassroom, deleteClassroom } = require('../controllers/classroom.controller');

router.get('/:schoolId', getClassrooms);
router.get('/:schoolId/:classroomId', getClassroom);
router.post('/:schoolId', createClassroom);
router.put('/:schoolId/:classroomId', updateClassroom);
router.delete('/:schoolId/:classroomId', deleteClassroom);

module.exports = router;

