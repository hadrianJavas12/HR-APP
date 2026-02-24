import { BaseModel } from './BaseModel.js';

export class AuditLog extends BaseModel {
  static get tableName() {
    return 'audit_logs';
  }

  // Audit logs are immutable — only created_at, no updated_at
  $beforeInsert() {
    this.created_at = new Date().toISOString();
  }

  $beforeUpdate() {
    // Audit logs should never be updated
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['entity', 'action'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        entity: { type: 'string', maxLength: 100 },
        entity_id: { type: ['string', 'null'] },
        action: { type: 'string', enum: ['create', 'update', 'delete', 'login', 'logout', 'approve', 'reject'] },
        old_data: { type: ['object', 'null'] },
        new_data: { type: ['object', 'null'] },
        performed_by: { type: ['string', 'null'] },
        ip_address: { type: ['string', 'null'] },
      },
    };
  }
}
