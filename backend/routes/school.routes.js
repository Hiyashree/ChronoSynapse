const express = require('express');
const router = express.Router();
const { getSchools, getSchool, createSchool, deleteSchool } = require('../controllers/school.controller');
const { authenticate } = require('../utils/auth');

// All routes support optional authentication for guest mode
router.get('/', getSchools);
router.get('/:schoolId', getSchool);
router.post('/', createSchool);
router.delete('/:schoolId', deleteSchool);

module.exports = router;

