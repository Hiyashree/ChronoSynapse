const express = require('express');
const router = express.Router();
const { signup, signin, getCurrentUser } = require('../controllers/auth.controller');
const { authenticate } = require('../utils/auth');

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;

