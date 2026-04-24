const express = require('express');
const router = express.Router();
const { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher } = require('../controllers/teacher.controller');

router.get('/:schoolId', getTeachers);
router.get('/:schoolId/:teacherId', getTeacher);
router.post('/:schoolId', createTeacher);
router.put('/:schoolId/:teacherId', updateTeacher);
router.delete('/:schoolId/:teacherId', deleteTeacher);

module.exports = router;

