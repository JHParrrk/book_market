const { validationResult } = require("express-validator");

/**
 * validate - Middleware to handle validation results
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @param {Function} next Express next middleware function
 */

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = validate;
