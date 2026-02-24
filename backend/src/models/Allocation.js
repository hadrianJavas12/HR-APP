import { BaseModel } from './BaseModel.js';

export class Allocation extends BaseModel {
  static get tableName() {
    return 'allocations';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['project_id', 'employee_id', 'period_start', 'period_end', 'planned_hours'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        project_id: { type: 'string', format: 'uuid' },
        employee_id: { type: 'string', format: 'uuid' },
        period_start: { type: 'string' },
        period_end: { type: 'string' },
        planned_hours: { type: 'number', minimum: 0 },
        billable: { type: 'boolean' },
        justification: { type: ['string', 'null'] },
      },
    };
  }

  static get relationMappings() {
    return {
      project: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Project.js`,
        join: { from: 'allocations.project_id', to: 'projects.id' },
      },
      employee: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Employee.js`,
        join: { from: 'allocations.employee_id', to: 'employees.id' },
      },
    };
  }
}
