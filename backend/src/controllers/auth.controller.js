import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'];
  const result = await authService.login(email, password, ipAddress);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'];
  const result = await authService.register(name, email, password, ipAddress);

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/v1/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.userId);
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/v1/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.userId);
  res.json({ success: true, data: user });
});

/**
 * PUT /api/v1/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.userId, currentPassword, newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
});
