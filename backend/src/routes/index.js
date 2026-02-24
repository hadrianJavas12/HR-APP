import { Router } from 'express';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employee.routes.js';
import projectRoutes from './project.routes.js';
import timesheetRoutes from './timesheet.routes.js';
import allocationRoutes from './allocation.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import miscRoutes from './misc.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API v1
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/employees', employeeRoutes);
router.use('/api/v1/projects', projectRoutes);
router.use('/api/v1/timesheets', timesheetRoutes);
router.use('/api/v1/allocations', allocationRoutes);
router.use('/api/v1/dashboard', dashboardRoutes);
router.use('/api/v1', miscRoutes);

export default router;
