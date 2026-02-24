import bcrypt from 'bcryptjs';

/**
 * Seed initial data for development / demo.
 * @param {import('knex').Knex} knex
 */
export async function seed(knex) {
  // ── Clean tables in order ─────────────────────
  await knex('audit_logs').del();
  await knex('notifications').del();
  await knex('non_project_activities').del();
  await knex('timesheets').del();
  await knex('tasks').del();
  await knex('allocations').del();
  await knex('projects').del();
  await knex('employees').del();
  await knex('users').del();
  await knex('work_calendar').del();
  await knex('tenants').del();

  // ── Tenant ────────────────────────────────────
  const [tenant] = await knex('tenants')
    .insert({
      name: 'Demo Company',
      slug: 'demo',
      settings: JSON.stringify({
        daily_hours: 8,
        weekly_capacity: 40,
        overload_threshold: 110,
        underutil_threshold: 60,
        timezone: 'Asia/Jakarta',
      }),
      status: 'active',
    })
    .returning('*');

  const tenantId = tenant.id;
  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Users ─────────────────────────────────────
  const users = await knex('users')
    .insert([
      { tenant_id: tenantId, email: 'admin@demo.com', password_hash: passwordHash, name: 'Super Admin', role: 'super_admin' },
      { tenant_id: tenantId, email: 'hr@demo.com', password_hash: passwordHash, name: 'HR Manager', role: 'hr_admin' },
      { tenant_id: tenantId, email: 'pm@demo.com', password_hash: passwordHash, name: 'Project Manager', role: 'project_manager' },
      { tenant_id: tenantId, email: 'john@demo.com', password_hash: passwordHash, name: 'John Developer', role: 'employee' },
      { tenant_id: tenantId, email: 'jane@demo.com', password_hash: passwordHash, name: 'Jane Designer', role: 'employee' },
      { tenant_id: tenantId, email: 'finance@demo.com', password_hash: passwordHash, name: 'Finance Officer', role: 'finance' },
      { tenant_id: tenantId, email: 'viewer@demo.com', password_hash: passwordHash, name: 'Read Only User', role: 'viewer' },
    ])
    .returning('*');

  const userMap = {};
  users.forEach((u) => { userMap[u.email] = u.id; });

  // ── Employees ─────────────────────────────────
  const employees = await knex('employees')
    .insert([
      { tenant_id: tenantId, user_id: userMap['pm@demo.com'], employee_code: 'EMP001', name: 'Project Manager', email: 'pm@demo.com', department: 'Engineering', position: 'PM', cost_per_hour: 75, capacity_per_week: 40, seniority_level: 'lead', status: 'active' },
      { tenant_id: tenantId, user_id: userMap['john@demo.com'], employee_code: 'EMP002', name: 'John Developer', email: 'john@demo.com', department: 'Engineering', position: 'Full-Stack Developer', cost_per_hour: 50, capacity_per_week: 40, seniority_level: 'senior', status: 'active' },
      { tenant_id: tenantId, user_id: userMap['jane@demo.com'], employee_code: 'EMP003', name: 'Jane Designer', email: 'jane@demo.com', department: 'Design', position: 'UI/UX Designer', cost_per_hour: 45, capacity_per_week: 40, seniority_level: 'mid', status: 'active' },
      { tenant_id: tenantId, employee_code: 'EMP004', name: 'Bob Analyst', email: 'bob@demo.com', department: 'Engineering', position: 'Business Analyst', cost_per_hour: 55, capacity_per_week: 40, seniority_level: 'senior', status: 'active' },
      { tenant_id: tenantId, employee_code: 'EMP005', name: 'Alice QA', email: 'alice@demo.com', department: 'QA', position: 'QA Engineer', cost_per_hour: 40, capacity_per_week: 40, seniority_level: 'mid', status: 'active' },
    ])
    .returning('*');

  const empMap = {};
  employees.forEach((e) => { empMap[e.employee_code] = e.id; });

  // ── Projects ──────────────────────────────────
  const projects = await knex('projects')
    .insert([
      { tenant_id: tenantId, code: 'PRJ001', name: 'E-Commerce Platform', client: 'Acme Corp', planned_hours: 2000, planned_cost: 100000, project_manager_id: empMap['EMP001'], start_date: '2026-01-01', end_date: '2026-06-30', priority: 'high', status: 'active' },
      { tenant_id: tenantId, code: 'PRJ002', name: 'Mobile Banking App', client: 'FinBank', planned_hours: 1500, planned_cost: 85000, project_manager_id: empMap['EMP001'], start_date: '2026-02-01', end_date: '2026-08-31', priority: 'critical', status: 'active' },
      { tenant_id: tenantId, code: 'PRJ003', name: 'Corporate Website Redesign', client: 'BigCo', planned_hours: 500, planned_cost: 25000, project_manager_id: empMap['EMP001'], start_date: '2026-03-01', end_date: '2026-04-30', priority: 'medium', status: 'planning' },
    ])
    .returning('*');

  const projMap = {};
  projects.forEach((p) => { projMap[p.code] = p.id; });

  // ── Allocations ───────────────────────────────
  await knex('allocations').insert([
    { tenant_id: tenantId, project_id: projMap['PRJ001'], employee_id: empMap['EMP002'], period_start: '2026-01-01', period_end: '2026-06-30', planned_hours: 800, billable: true },
    { tenant_id: tenantId, project_id: projMap['PRJ001'], employee_id: empMap['EMP003'], period_start: '2026-01-01', period_end: '2026-06-30', planned_hours: 400, billable: true },
    { tenant_id: tenantId, project_id: projMap['PRJ001'], employee_id: empMap['EMP005'], period_start: '2026-01-01', period_end: '2026-06-30', planned_hours: 300, billable: true },
    { tenant_id: tenantId, project_id: projMap['PRJ002'], employee_id: empMap['EMP002'], period_start: '2026-02-01', period_end: '2026-08-31', planned_hours: 600, billable: true },
    { tenant_id: tenantId, project_id: projMap['PRJ002'], employee_id: empMap['EMP004'], period_start: '2026-02-01', period_end: '2026-08-31', planned_hours: 500, billable: true },
  ]);

  // ── Tasks ─────────────────────────────────────
  const tasks = await knex('tasks')
    .insert([
      { tenant_id: tenantId, project_id: projMap['PRJ001'], title: 'Backend API Development', estimated_hours: 400, assigned_to: empMap['EMP002'], status: 'in_progress' },
      { tenant_id: tenantId, project_id: projMap['PRJ001'], title: 'UI Design System', estimated_hours: 200, assigned_to: empMap['EMP003'], status: 'in_progress' },
      { tenant_id: tenantId, project_id: projMap['PRJ001'], title: 'Integration Testing', estimated_hours: 150, assigned_to: empMap['EMP005'], status: 'todo' },
      { tenant_id: tenantId, project_id: projMap['PRJ002'], title: 'Payment Gateway Integration', estimated_hours: 300, assigned_to: empMap['EMP002'], status: 'todo' },
      { tenant_id: tenantId, project_id: projMap['PRJ002'], title: 'Requirements Analysis', estimated_hours: 200, assigned_to: empMap['EMP004'], status: 'in_progress' },
    ])
    .returning('*');

  // ── Timesheets (sample data for February 2026) ──
  const timesheetData = [];
  const startDate = new Date('2026-02-02'); // Monday
  for (let week = 0; week < 3; week++) {
    for (let day = 0; day < 5; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + week * 7 + day);
      const dateStr = date.toISOString().split('T')[0];

      // John — works on PRJ001 & PRJ002
      timesheetData.push({ tenant_id: tenantId, employee_id: empMap['EMP002'], project_id: projMap['PRJ001'], task_id: tasks[0].id, date: dateStr, hours: 5, mode: 'normal', approval_status: 'approved', approved_by: userMap['pm@demo.com'] });
      timesheetData.push({ tenant_id: tenantId, employee_id: empMap['EMP002'], project_id: projMap['PRJ002'], task_id: tasks[3].id, date: dateStr, hours: 4, mode: 'normal', approval_status: 'approved', approved_by: userMap['pm@demo.com'] });

      // Jane — works on PRJ001
      timesheetData.push({ tenant_id: tenantId, employee_id: empMap['EMP003'], project_id: projMap['PRJ001'], task_id: tasks[1].id, date: dateStr, hours: 7, mode: 'normal', approval_status: 'approved', approved_by: userMap['pm@demo.com'] });

      // Bob — works on PRJ002
      timesheetData.push({ tenant_id: tenantId, employee_id: empMap['EMP004'], project_id: projMap['PRJ002'], task_id: tasks[4].id, date: dateStr, hours: 6, mode: 'normal', approval_status: 'approved', approved_by: userMap['pm@demo.com'] });

      // Alice — works on PRJ001
      timesheetData.push({ tenant_id: tenantId, employee_id: empMap['EMP005'], project_id: projMap['PRJ001'], task_id: tasks[2].id, date: dateStr, hours: 5, mode: 'normal', approval_status: 'pending' });
    }
  }
  await knex('timesheets').insert(timesheetData);

  console.log('✅ Seed data inserted successfully');
}
