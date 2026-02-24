import { describe, test, expect, beforeAll } from '@jest/globals';

describe('Validator Schemas', () => {
  let authValidator;

  beforeAll(async () => {
    authValidator = await import('../src/validators/auth.validator.js');
  });

  describe('loginSchema', () => {
    test('accepts valid login data', () => {
      const { error } = authValidator.loginSchema.validate({
        username: 'admin',
        password: 'password123',
      });
      expect(error).toBeUndefined();
    });

    test('rejects missing username', () => {
      const { error } = authValidator.loginSchema.validate({
        password: 'password123',
      });
      expect(error).toBeDefined();
    });

    test('rejects short password', () => {
      const { error } = authValidator.loginSchema.validate({
        username: 'admin',
        password: '12',
      });
      expect(error).toBeDefined();
    });
  });

  describe('changePasswordSchema', () => {
    test('accepts valid password change', () => {
      const { error } = authValidator.changePasswordSchema.validate({
        current_password: 'oldpass123',
        new_password: 'newpass456',
      });
      expect(error).toBeUndefined();
    });

    test('rejects when new password is too short', () => {
      const { error } = authValidator.changePasswordSchema.validate({
        current_password: 'oldpass123',
        new_password: '12',
      });
      expect(error).toBeDefined();
    });
  });
});
