import { BaseModel } from './BaseModel.js';

export class User extends BaseModel {
  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password_hash', 'name', 'role'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email', maxLength: 255 },
        password_hash: { type: 'string' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        role: { type: 'string', enum: ['super_admin', 'hr_admin', 'project_manager', 'employee', 'finance', 'viewer'] },
        avatar_url: { type: ['string', 'null'] },
        is_active: { type: 'boolean' },
        refresh_token: { type: ['string', 'null'] },
        last_login_at: { type: ['string', 'null'] },
      },
    };
  }

  /**
   * Exclude password_hash from JSON serialization.
   */
  $formatJson(json) {
    json = super.$formatJson(json);
    delete json.password_hash;
    delete json.refresh_token;
    return json;
  }

  static get relationMappings() {
    // Lazy require to avoid circular dependencies
    return {
      employee: {
        relation: BaseModel.HasOneRelation,
        modelClass: `${import.meta.dirname}/Employee.js`,
        join: { from: 'users.id', to: 'employees.user_id' },
      },
    };
  }
}
