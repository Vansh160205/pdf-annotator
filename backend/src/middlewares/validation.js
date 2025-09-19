const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  validateRequest
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest
];

const validateHighlight = [
  body('pdfUuid')
    .isUUID()
    .withMessage('Valid PDF UUID is required'),
  body('pageNumber')
    .isInt({ min: 1 })
    .withMessage('Page number must be a positive integer'),
  body('highlightedText')
    .trim()
    .notEmpty()
    .withMessage('Highlighted text is required'),
  body('position')
    .isObject()
    .withMessage('Position object is required'),
  body('boundingBox')
    .isObject()
    .withMessage('Bounding box object is required'),
  validateRequest
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateHighlight,
  validateRequest
};