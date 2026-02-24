import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api.js';

export const useTimesheetStore = defineStore('timesheets', () => {
  const timesheets = ref([]);
  const currentTimesheet = ref(null);
  const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const loading = ref(false);

  async function fetchTimesheets(query = {}) {
    loading.value = true;
    try {
      const params = { page: pagination.value.page, limit: pagination.value.limit, ...query };
      const { data } = await api.get('/timesheets', { params });
      timesheets.value = data.data;
      pagination.value = data.pagination;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTimesheet(id) {
    loading.value = true;
    try {
      const { data } = await api.get(`/timesheets/${id}`);
      currentTimesheet.value = data.data;
      return data.data;
    } finally {
      loading.value = false;
    }
  }

  async function createTimesheet(payload) {
    const { data } = await api.post('/timesheets', payload);
    return data.data;
  }

  async function bulkCreate(entries) {
    const { data } = await api.post('/timesheets/bulk', { entries });
    return data.data;
  }

  async function updateTimesheet(id, payload) {
    const { data } = await api.put(`/timesheets/${id}`, payload);
    return data.data;
  }

  async function approveTimesheet(id, status, rejectionReason) {
    const { data } = await api.put(`/timesheets/${id}/approve`, {
      status,
      rejection_reason: rejectionReason,
    });
    return data.data;
  }

  async function deleteTimesheet(id) {
    await api.delete(`/timesheets/${id}`);
  }

  return {
    timesheets, currentTimesheet, pagination, loading,
    fetchTimesheets, fetchTimesheet, createTimesheet, bulkCreate,
    updateTimesheet, approveTimesheet, deleteTimesheet,
  };
});
