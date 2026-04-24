const express = require('express');
const router = express.Router();
const { getSubjects, getSubject, createSubject, updateSubject, deleteSubject } = require('../controllers/subject.controller');

router.get('/:schoolId', getSubjects);
router.get('/:schoolId/:subjectId', getSubject);
router.post('/:schoolId', createSubject);
router.put('/:schoolId/:subjectId', updateSubject);
router.delete('/:schoolId/:subjectId', deleteSubject);

module.exports = router;

