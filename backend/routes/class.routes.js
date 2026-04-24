const express = require('express');
const router = express.Router();
const { getClasses, getClass, createClass, updateClass, deleteClass } = require('../controllers/class.controller');

router.get('/:schoolId', getClasses);
router.get('/:schoolId/:classId', getClass);
router.post('/:schoolId', createClass);
router.put('/:schoolId/:classId', updateClass);
router.delete('/:schoolId/:classId', deleteClass);

module.exports = router;

