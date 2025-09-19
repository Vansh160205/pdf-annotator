const express = require('express');
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const { validateRegistration, validateLogin } = require('../middlewares/validation');

const router = express.Router();

// Authentication routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', auth, authController.getCurrentUser);
router.post('/verify', auth, authController.verifyToken);
router.post('/logout', auth, authController.logout);
router.post('/refresh', auth, authController.refreshToken);

module.exports = router;