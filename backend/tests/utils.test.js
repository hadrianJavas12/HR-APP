import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * Unit tests for utility functions
 */

describe('Pagination Helper', () => {
  let paginate, parsePagination;

  beforeAll(async () => {
    const mod = await import('../src/utils/pagination.js');
    paginate = mod.paginate;
    parsePagination = mod.parsePagination;
  });

  test('parsePagination returns defaults for empty query', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  test('parsePagination parses valid values', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  test('parsePagination clamps limit to max 100', () => {
    const result = parsePagination({ page: '1', limit: '500' });
    expect(result.limit).toBeLessThanOrEqual(100);
  });

  test('parsePagination handles negative page', () => {
    const result = parsePagination({ page: '-1' });
    expect(result.page).toBeGreaterThanOrEqual(1);
  });

  test('paginate formats response correctly', () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = paginate(data, 50, 1, 20);
    expect(result).toEqual({
      data,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      },
    });
  });

  test('paginate calculates totalPages correctly', () => {
    const result = paginate([], 0, 1, 20);
    expect(result.pagination.totalPages).toBe(0);
  });
});

describe('Error Classes', () => {
  let errors;

  beforeAll(async () => {
    errors = await import('../src/utils/errors.js');
  });

  test('AppError has correct properties', () => {
    const err = new errors.AppError('test', 500);
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
  });

  test('NotFoundError defaults to 404', () => {
    const err = new errors.NotFoundError('item');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('item');
  });

  test('ValidationError defaults to 400', () => {
    const err = new errors.ValidationError('bad input');
    expect(err.statusCode).toBe(400);
  });

  test('UnauthorizedError defaults to 401', () => {
    const err = new errors.UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  test('ForbiddenError defaults to 403', () => {
    const err = new errors.ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  test('ConflictError defaults to 409', () => {
    const err = new errors.ConflictError('dup');
    expect(err.statusCode).toBe(409);
  });
});
