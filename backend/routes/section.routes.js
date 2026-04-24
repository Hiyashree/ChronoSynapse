const express = require('express');
const router = express.Router();
const { getSections, getSection, createSection, updateSection, deleteSection } = require('../controllers/section.controller');

router.get('/:classId', getSections);
router.get('/:classId/:sectionId', getSection);
router.post('/:classId', createSection);
router.put('/:classId/:sectionId', updateSection);
router.delete('/:classId/:sectionId', deleteSection);

module.exports = router;

