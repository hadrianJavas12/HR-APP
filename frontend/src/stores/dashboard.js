import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api.js';

export const useDashboardStore = defineStore('dashboard', () => {
  const companyData = ref(null);
  const utilizationData = ref([]);
  const projectBurnRates = ref([]);
  const loading = ref(false);

  async function fetchCompanyDashboard(periodStart, periodEnd) {
    loading.value = true;
    try {
      const params = {};
      if (periodStart) params.period_start = periodStart;
      if (periodEnd) params.period_end = periodEnd;
      const { data } = await api.get('/dashboard/company', { params });
      companyData.value = data.data;
      return data.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUtilization(periodStart, periodEnd) {
    const params = {};
    if (periodStart) params.period_start = periodStart;
    if (periodEnd) params.period_end = periodEnd;
    const { data } = await api.get('/dashboard/utilization', { params });
    utilizationData.value = data.data;
    return data.data;
  }

  async function fetchProjectBurnRates() {
    const { data } = await api.get('/dashboard/projects');
    projectBurnRates.value = data.data;
    return data.data;
  }

  async function fetchProjectDashboard(projectId) {
    const { data } = await api.get(`/dashboard/projects/${projectId}`);
    return data.data;
  }

  async function fetchEmployeeDashboard(employeeId, periodStart, periodEnd) {
    const params = {};
    if (periodStart) params.period_start = periodStart;
    if (periodEnd) params.period_end = periodEnd;
    const { data } = await api.get(`/dashboard/employees/${employeeId}`, { params });
    return data.data;
  }

  return {
    companyData, utilizationData, projectBurnRates, loading,
    fetchCompanyDashboard, fetchUtilization, fetchProjectBurnRates,
    fetchProjectDashboard, fetchEmployeeDashboard,
  };
});
