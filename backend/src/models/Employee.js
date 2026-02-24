import { BaseModel } from './BaseModel.js';

export class Employee extends BaseModel {
  static get tableName() {
    return 'employees';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'email', 'cost_per_hour'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        user_id: { type: ['string', 'null'] },
        employee_code: { type: ['string', 'null'], maxLength: 50 },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        department: { type: ['string', 'null'], maxLength: 100 },
        position: { type: ['string', 'null'], maxLength: 100 },
        cost_per_hour: { type: 'number', minimum: 0 },
        capacity_per_week: { type: 'integer', minimum: 0, default: 40 },
        seniority_level: { type: 'string', enum: ['junior', 'mid', 'senior', 'lead', 'principal'] },
        status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] },
      },
    };
  }

  static get relationMappings() {
    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/User.js`,
        join: { from: 'employees.user_id', to: 'users.id' },
      },
      timesheets: {
        relation: BaseModel.HasManyRelation,
        modelClass: `${import.meta.dirname}/Timesheet.js`,
        join: { from: 'employees.id', to: 'timesheets.employee_id' },
      },
      allocations: {
        relation: BaseModel.HasManyRelation,
        modelClass: `${import.meta.dirname}/Allocation.js`,
        join: { from: 'employees.id', to: 'allocations.employee_id' },
      },
    };
  }
}
