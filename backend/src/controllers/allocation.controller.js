import * as allocationService from '../services/allocation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/allocations
 */
export const list = asyncHandler(async (req, res) => {
  const result = await allocationService.listAllocations(req.tenantId, req.query);
  res.json({ success: true, ...result });
});

/**
 * GET /api/v1/allocations/:id
 */
export const getById = asyncHandler(async (req, res) => {
  const alloc = await allocationService.getAllocation(req.tenantId, req.params.id);
  res.json({ success: true, data: alloc });
});

/**
 * POST /api/v1/allocations
 */
export const create = asyncHandler(async (req, res) => {
  const { allocation, warning } = await allocationService.createAllocation(req.tenantId, req.body, req.user.userId);
  res.status(201).json({ success: true, data: allocation, warning });
});

/**
 * PUT /api/v1/allocations/:id
 */
export const update = asyncHandler(async (req, res) => {
  const alloc = await allocationService.updateAllocation(req.tenantId, req.params.id, req.body, req.user.userId);
  res.json({ success: true, data: alloc });
});

/**
 * DELETE /api/v1/allocations/:id
 */
export const remove = asyncHandler(async (req, res) => {
  await allocationService.deleteAllocation(req.tenantId, req.params.id, req.user.userId);
  res.json({ success: true, message: 'Allocation deleted' });
});
