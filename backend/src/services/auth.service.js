import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * @typedef {Object} LoginResult
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {Object} user
 */

/**
 * Authenticate user and return JWT tokens.
 * @param {string} email
 * @param {string} password
 * @param {string} [ipAddress]
 * @returns {Promise<LoginResult>}
 */
export async function login(email, password, ipAddress) {
  const user = await User.query()
    .where('email', email)
    .where('is_active', true)
    .first();

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Save refresh token
  await User.query()
    .findById(user.id)
    .patch({
      refresh_token: refreshToken,
      last_login_at: new Date().toISOString(),
    });

  // Audit log
  await AuditLog.query().insert({
    tenant_id: user.tenant_id,
    entity: 'user',
    entity_id: user.id,
    action: 'login',
    performed_by: user.id,
    ip_address: ipAddress,
  });

  logger.info({ userId: user.id, email: user.email }, 'User logged in');

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
    },
  };
}

/**
 * Refresh access token using a refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await User.query()
    .findById(decoded.userId)
    .where('is_active', true);

  if (!user || user.refresh_token !== refreshToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  await User.query().findById(user.id).patch({ refresh_token: newRefreshToken });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout — invalidate refresh token.
 * @param {string} userId
 */
export async function logout(userId) {
  await User.query().findById(userId).patch({ refresh_token: null });
}

/**
 * Change password.
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.query().findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');

  const hash = await bcrypt.hash(newPassword, 10);
  await User.query().findById(userId).patch({ password_hash: hash, refresh_token: null });
}

/**
 * Get current user profile.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getProfile(userId) {
  const user = await User.query().findById(userId);
  if (!user) throw new NotFoundError('User not found');
  return user.$formatJson(user);
}

/**
 * Register a new user account.
 * Assigns the user to the default tenant with role 'employee'.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @param {string} [ipAddress]
 * @returns {Promise<LoginResult>}
 */
export async function register(name, email, password, ipAddress) {
  // Find default tenant
  const { Tenant } = await import('../models/Tenant.js');
  let tenant = await Tenant.query().where('status', 'active').first();
  if (!tenant) {
    throw new NotFoundError('No active tenant available. Contact administrator.');
  }

  // Check duplicate email within tenant
  const existing = await User.query()
    .where('tenant_id', tenant.id)
    .where('email', email)
    .first();

  if (existing) {
    throw new ConflictError('Email sudah terdaftar. Silakan gunakan email lain.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.query().insert({
    tenant_id: tenant.id,
    email,
    password_hash: passwordHash,
    name,
    role: 'employee',
    is_active: true,
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await User.query().findById(user.id).patch({
    refresh_token: refreshToken,
    last_login_at: new Date().toISOString(),
  });

  await AuditLog.query().insert({
    tenant_id: tenant.id,
    entity: 'user',
    entity_id: user.id,
    action: 'create',
    new_data: { name, email, role: 'employee' },
    performed_by: user.id,
    ip_address: ipAddress,
  });

  logger.info({ userId: user.id, email }, 'New user registered');

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
    },
  };
}

// ── Token helpers ─────────────────────────────

/**
 * @param {Object} user
 * @returns {string}
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * @param {Object} user
 * @returns {string}
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}
