import { BaseModel } from './BaseModel.js';

export class Project extends BaseModel {
  static get tableName() {
    return 'projects';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        code: { type: ['string', 'null'], maxLength: 50 },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        client: { type: ['string', 'null'], maxLength: 255 },
        description: { type: ['string', 'null'] },
        planned_hours: { type: 'number', minimum: 0 },
        planned_cost: { type: 'number', minimum: 0 },
        project_manager_id: { type: ['string', 'null'] },
        start_date: { type: ['string', 'null'] },
        end_date: { type: ['string', 'null'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        status: { type: 'string', enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
      },
    };
  }

  static get relationMappings() {
    return {
      manager: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Employee.js`,
        join: { from: 'projects.project_manager_id', to: 'employees.id' },
      },
      allocations: {
        relation: BaseModel.HasManyRelation,
        modelClass: `${import.meta.dirname}/Allocation.js`,
        join: { from: 'projects.id', to: 'allocations.project_id' },
      },
      tasks: {
        relation: BaseModel.HasManyRelation,
        modelClass: `${import.meta.dirname}/Task.js`,
        join: { from: 'projects.id', to: 'tasks.project_id' },
      },
      timesheets: {
        relation: BaseModel.HasManyRelation,
        modelClass: `${import.meta.dirname}/Timesheet.js`,
        join: { from: 'projects.id', to: 'timesheets.project_id' },
      },
    };
  }
}
