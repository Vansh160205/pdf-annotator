const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthController {
  // Register new user
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      const user = new User({ email, password, name });
      await user.save();

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  }

  // Login user
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  }

  // Get current user
  async getCurrentUser(req, res, next) {
    try {
      res.json({ user: req.user });
    } catch (error) {
      next(error);
    }
  }

  // Verify token
  async verifyToken(req, res, next) {
    try {
      res.json({ valid: true, user: req.user });
    } catch (error) {
      next(error);
    }
  }

  // Logout (client-side token removal)
  async logout(req, res, next) {
    try {
      // In a more sophisticated setup, you might want to blacklist the token
      res.json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  async refreshToken(req, res, next) {
    try {
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Token refreshed',
        token,
        user: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();