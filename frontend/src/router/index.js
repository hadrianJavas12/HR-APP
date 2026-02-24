import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
      },
      {
        path: 'employees',
        name: 'Employees',
        component: () => import('../views/EmployeesView.vue'),
      },
      {
        path: 'employees/:id',
        name: 'EmployeeDetail',
        component: () => import('../views/EmployeeDetailView.vue'),
        props: true,
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('../views/ProjectsView.vue'),
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('../views/ProjectDetailView.vue'),
        props: true,
      },
      {
        path: 'timesheets',
        name: 'Timesheets',
        component: () => import('../views/TimesheetsView.vue'),
      },
      {
        path: 'allocations',
        name: 'Allocations',
        component: () => import('../views/AllocationsView.vue'),
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/ReportsView.vue'),
        meta: { roles: ['super_admin', 'hr_admin', 'project_manager', 'finance'] },
      },
      {
        path: 'audit-logs',
        name: 'AuditLogs',
        component: () => import('../views/AuditLogsView.vue'),
        meta: { roles: ['super_admin', 'hr_admin'] },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return next({ name: 'Dashboard' });
  }

  // Role check
  if (to.meta.roles && !to.meta.roles.includes(authStore.userRole)) {
    return next({ name: 'Dashboard' });
  }

  next();
});

export default router;
