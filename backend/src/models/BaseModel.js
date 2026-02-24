import { Model } from 'objection';

/**
 * Base model with common settings for all domain models.
 * All models extend this for consistent timestamp handling and tenant scoping.
 */
export class BaseModel extends Model {
  /**
   * Auto-set created_at and updated_at.
   */
  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }

  /**
   * Scope query to a specific tenant.
   * @param {import('objection').QueryBuilder} query
   * @param {string} tenantId
   * @returns {import('objection').QueryBuilder}
   */
  static scopeTenant(query, tenantId) {
    return query.where(`${this.tableName}.tenant_id`, tenantId);
  }
}
