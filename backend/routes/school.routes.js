const express = require('express');
const router = express.Router();
const { getSchools, getSchool, createSchool, deleteSchool } = require('../controllers/school.controller');
const { optionalAuthenticate } = require('../utils/auth');

router.use(optionalAuthenticate);

router.get('/', getSchools);
router.get('/:schoolId', getSchool);
router.post('/', createSchool);
router.delete('/:schoolId', deleteSchool);

module.exports = router;

