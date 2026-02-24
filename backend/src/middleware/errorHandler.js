import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Global error handling middleware.
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  // Default to 500
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';

  // Joi / validation errors
  if (err.isJoi) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled error');
  } else {
    logger.warn({ code, message: err.message, url: req.originalUrl }, 'Client error');
  }

  const response = {
    success: false,
    error: {
      code,
      message: err.message || 'Internal Server Error',
    },
  };

  // Include validation details
  if (err.errors && err.errors.length > 0) {
    response.error.details = err.errors;
  }

  // Include Joi details
  if (err.isJoi && err.details) {
    response.error.details = err.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
  }

  // Stack trace in development
  if (config.env === 'development' && statusCode >= 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
