import { BaseModel } from './BaseModel.js';

export class Timesheet extends BaseModel {
  static get tableName() {
    return 'timesheets';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['employee_id', 'project_id', 'date', 'hours'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        employee_id: { type: 'string', format: 'uuid' },
        project_id: { type: 'string', format: 'uuid' },
        task_id: { type: ['string', 'null'] },
        date: { type: 'string' },
        hours: { type: 'number', minimum: 0.25, maximum: 24 },
        mode: { type: 'string', enum: ['normal', 'overtime', 'holiday'] },
        notes: { type: ['string', 'null'] },
        approval_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        approved_by: { type: ['string', 'null'] },
        approved_at: { type: ['string', 'null'] },
        rejection_reason: { type: ['string', 'null'] },
      },
    };
  }

  static get relationMappings() {
    return {
      employee: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Employee.js`,
        join: { from: 'timesheets.employee_id', to: 'employees.id' },
      },
      project: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Project.js`,
        join: { from: 'timesheets.project_id', to: 'projects.id' },
      },
      task: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Task.js`,
        join: { from: 'timesheets.task_id', to: 'tasks.id' },
      },
    };
  }
}
