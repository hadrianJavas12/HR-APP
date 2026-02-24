/**
 * Initial schema migration — core tables for HR Man-Hour Monitoring.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ── Extension ─────────────────────────────────
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ── Tenants ───────────────────────────────────
  await knex.schema.createTable('tenants', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.string('slug', 100).unique().notNullable();
    t.jsonb('settings').defaultTo('{}');
    t.enum('status', ['active', 'suspended', 'trial']).defaultTo('active');
    t.timestamps(true, true);
  });

  // ── Users (system accounts) ───────────────────
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.string('email', 255).notNullable();
    t.string('password_hash', 255).notNullable();
    t.string('name', 255).notNullable();
    t.enum('role', ['super_admin', 'hr_admin', 'project_manager', 'employee', 'finance', 'viewer'])
      .notNullable()
      .defaultTo('employee');
    t.string('avatar_url', 500);
    t.boolean('is_active').defaultTo(true);
    t.string('refresh_token', 500);
    t.timestamp('last_login_at');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'email']);
  });

  // ── Employees (resource master) ───────────────
  await knex.schema.createTable('employees', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('employee_code', 50);
    t.string('name', 255).notNullable();
    t.string('email', 255).notNullable();
    t.string('department', 100);
    t.string('position', 100);
    t.decimal('cost_per_hour', 12, 2).notNullable().defaultTo(0);
    t.integer('capacity_per_week').defaultTo(40);
    t.enum('seniority_level', ['junior', 'mid', 'senior', 'lead', 'principal']).defaultTo('mid');
    t.enum('status', ['active', 'inactive', 'on_leave']).defaultTo('active');
    t.date('joined_at');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'email']);
    t.index(['tenant_id', 'department']);
    t.index(['tenant_id', 'status']);
  });

  // ── Projects ──────────────────────────────────
  await knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.string('code', 50);
    t.string('name', 255).notNullable();
    t.string('client', 255);
    t.text('description');
    t.decimal('planned_hours', 12, 2).defaultTo(0);
    t.decimal('planned_cost', 14, 2).defaultTo(0);
    t.uuid('project_manager_id').references('id').inTable('employees').onDelete('SET NULL');
    t.date('start_date');
    t.date('end_date');
    t.enum('priority', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
    t.enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled']).defaultTo('planning');
    t.timestamps(true, true);

    t.unique(['tenant_id', 'code']);
    t.index(['tenant_id', 'status']);
    t.index(['tenant_id', 'start_date']);
  });

  // ── Allocations ───────────────────────────────
  await knex.schema.createTable('allocations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    t.date('period_start').notNullable();
    t.date('period_end').notNullable();
    t.decimal('planned_hours', 10, 2).notNullable();
    t.boolean('billable').defaultTo(true);
    t.text('justification');
    t.timestamps(true, true);

    t.index(['tenant_id', 'employee_id', 'period_start']);
    t.index(['tenant_id', 'project_id']);
  });

  // ── Tasks ─────────────────────────────────────
  await knex.schema.createTable('tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.string('title', 500).notNullable();
    t.text('description');
    t.decimal('estimated_hours', 10, 2).defaultTo(0);
    t.uuid('assigned_to').references('id').inTable('employees').onDelete('SET NULL');
    t.enum('status', ['todo', 'in_progress', 'review', 'done', 'cancelled']).defaultTo('todo');
    t.timestamps(true, true);

    t.index(['tenant_id', 'project_id']);
    t.index(['tenant_id', 'assigned_to']);
  });

  // ── Timesheets ────────────────────────────────
  await knex.schema.createTable('timesheets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    t.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('task_id').references('id').inTable('tasks').onDelete('SET NULL');
    t.date('date').notNullable();
    t.decimal('hours', 5, 2).notNullable();
    t.enum('mode', ['normal', 'overtime', 'holiday']).defaultTo('normal');
    t.text('notes');
    t.enum('approval_status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    t.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approved_at');
    t.text('rejection_reason');
    t.timestamps(true, true);

    t.index(['tenant_id', 'employee_id', 'date']);
    t.index(['tenant_id', 'project_id', 'date']);
    t.index(['tenant_id', 'approval_status']);
  });

  // ── Non-Project Activities ────────────────────
  await knex.schema.createTable('non_project_activities', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    t.date('date').notNullable();
    t.decimal('hours', 5, 2).notNullable();
    t.enum('category', ['meeting', 'training', 'admin', 'leave', 'sick', 'other']).notNullable();
    t.text('notes');
    t.timestamps(true, true);

    t.index(['tenant_id', 'employee_id', 'date']);
  });

  // ── Work Calendar ─────────────────────────────
  await knex.schema.createTable('work_calendar', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.date('date').notNullable();
    t.boolean('is_working_day').defaultTo(true);
    t.string('label', 255); // e.g. "National Holiday"
    t.decimal('default_hours', 4, 2).defaultTo(8);
    t.timestamps(true, true);

    t.unique(['tenant_id', 'date']);
  });

  // ── Notifications ─────────────────────────────
  await knex.schema.createTable('notifications', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 50).notNullable(); // alert, info, warning
    t.string('title', 500).notNullable();
    t.text('message');
    t.jsonb('data').defaultTo('{}');
    t.boolean('is_read').defaultTo(false);
    t.timestamps(true, true);

    t.index(['tenant_id', 'user_id', 'is_read']);
  });

  // ── Audit Logs ────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    t.string('entity', 100).notNullable();
    t.uuid('entity_id');
    t.enum('action', ['create', 'update', 'delete', 'login', 'logout', 'approve', 'reject']).notNullable();
    t.jsonb('old_data');
    t.jsonb('new_data');
    t.uuid('performed_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('ip_address', 50);
    t.timestamp('created_at').defaultTo(knex.fn.now());

    t.index(['tenant_id', 'entity', 'entity_id']);
    t.index(['tenant_id', 'performed_by']);
    t.index('created_at');
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  const tables = [
    'audit_logs',
    'notifications',
    'work_calendar',
    'non_project_activities',
    'timesheets',
    'tasks',
    'allocations',
    'projects',
    'employees',
    'users',
    'tenants',
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
