import { BaseModel } from './BaseModel.js';

export class Task extends BaseModel {
  static get tableName() {
    return 'tasks';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['project_id', 'title'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        tenant_id: { type: 'string', format: 'uuid' },
        project_id: { type: 'string', format: 'uuid' },
        title: { type: 'string', minLength: 1, maxLength: 500 },
        description: { type: ['string', 'null'] },
        estimated_hours: { type: 'number', minimum: 0 },
        assigned_to: { type: ['string', 'null'] },
        status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'] },
      },
    };
  }

  static get relationMappings() {
    return {
      project: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Project.js`,
        join: { from: 'tasks.project_id', to: 'projects.id' },
      },
      assignee: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: `${import.meta.dirname}/Employee.js`,
        join: { from: 'tasks.assigned_to', to: 'employees.id' },
      },
    };
  }
}
