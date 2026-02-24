import { getDb } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Tenant resolution middleware.
 * For MVP: tenant is extracted from the authenticated user's JWT payload.
 * For SaaS: could also be resolved via subdomain or header.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function resolveTenant(req, res, next) {
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }
  next();
}

/**
 * Require tenant — if no tenant found after authentication, reject.
 */
export function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(400).json({
      success: false,
      error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' },
    });
  }
  next();
}
