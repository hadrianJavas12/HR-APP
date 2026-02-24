/**
 * Materialized views for dashboard aggregations.
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ── Employee Utilization Summary ─────────────
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_employee_utilization AS
    SELECT
      e.tenant_id,
      e.id AS employee_id,
      e.name AS employee_name,
      e.department,
      e.cost_per_hour,
      e.capacity_per_week,
      DATE_TRUNC('week', t.date) AS week_start,
      COALESCE(SUM(t.hours) FILTER (WHERE t.approval_status = 'approved'), 0) AS actual_hours,
      COALESCE(SUM(t.hours) FILTER (WHERE t.mode = 'overtime' AND t.approval_status = 'approved'), 0) AS overtime_hours,
      COALESCE(SUM(npa.hours), 0) AS non_project_hours
    FROM employees e
    LEFT JOIN timesheets t ON t.employee_id = e.id
    LEFT JOIN non_project_activities npa ON npa.employee_id = e.id
      AND DATE_TRUNC('week', npa.date) = DATE_TRUNC('week', t.date)
    WHERE e.status = 'active'
    GROUP BY e.tenant_id, e.id, e.name, e.department, e.cost_per_hour, e.capacity_per_week, DATE_TRUNC('week', t.date)
    WITH DATA;
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_emp_util
    ON mv_employee_utilization (tenant_id, employee_id, week_start);
  `);

  // ── Project Cost Summary ─────────────────────
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_cost AS
    SELECT
      p.tenant_id,
      p.id AS project_id,
      p.name AS project_name,
      p.planned_hours,
      p.planned_cost,
      p.status AS project_status,
      COALESCE(SUM(t.hours) FILTER (WHERE t.approval_status = 'approved'), 0) AS actual_hours,
      COALESCE(SUM(t.hours * e.cost_per_hour) FILTER (WHERE t.approval_status = 'approved'), 0) AS actual_cost,
      COUNT(DISTINCT t.employee_id) AS team_size
    FROM projects p
    LEFT JOIN timesheets t ON t.project_id = p.id
    LEFT JOIN employees e ON e.id = t.employee_id
    GROUP BY p.tenant_id, p.id, p.name, p.planned_hours, p.planned_cost, p.status
    WITH DATA;
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_proj_cost
    ON mv_project_cost (tenant_id, project_id);
  `);
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_project_cost CASCADE');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS mv_employee_utilization CASCADE');
}
