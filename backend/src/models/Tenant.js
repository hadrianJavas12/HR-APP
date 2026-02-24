import { BaseModel } from './BaseModel.js';

export class Tenant extends BaseModel {
  static get tableName() {
    return 'tenants';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'slug'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        slug: { type: 'string', minLength: 1, maxLength: 100 },
        settings: { type: 'object' },
        status: { type: 'string', enum: ['active', 'suspended', 'trial'] },
      },
    };
  }
}
