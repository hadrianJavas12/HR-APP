import { BaseModel } from './BaseModel.js';

export class Notification extends BaseModel {
  static get tableName() {
    return 'notifications';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'type', 'title'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        type: { type: 'string', maxLength: 50 },
        title: { type: 'string', maxLength: 500 },
        message: { type: ['string', 'null'] },
        data: { type: 'object' },
        is_read: { type: 'boolean' },
      },
    };
  }
}
