import { ValidationError } from '../utils/errors.js';

/**
 * Joi validation middleware factory.
 * Validates the specified request property (body, query, params) against a Joi schema.
 *
 * @param {import('joi').Schema} schema - Joi schema
 * @param {'body' | 'query' | 'params'} [property='body']
 * @returns {Function}
 */
export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    // Replace with sanitized values
    req[property] = value;
    next();
  };
}
