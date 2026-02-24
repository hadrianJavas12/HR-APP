import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api.js';

export const useEmployeeStore = defineStore('employees', () => {
  const employees = ref([]);
  const currentEmployee = ref(null);
  const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const loading = ref(false);

  async function fetchEmployees(query = {}) {
    loading.value = true;
    try {
      const params = { page: pagination.value.page, limit: pagination.value.limit, ...query };
      const { data } = await api.get('/employees', { params });
      employees.value = data.data;
      pagination.value = data.pagination;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEmployee(id) {
    loading.value = true;
    try {
      const { data } = await api.get(`/employees/${id}`);
      currentEmployee.value = data.data;
      return data.data;
    } finally {
      loading.value = false;
    }
  }

  async function createEmployee(payload) {
    const { data } = await api.post('/employees', payload);
    return data.data;
  }

  async function updateEmployee(id, payload) {
    const { data } = await api.put(`/employees/${id}`, payload);
    return data.data;
  }

  async function deleteEmployee(id) {
    await api.delete(`/employees/${id}`);
  }

  return {
    employees, currentEmployee, pagination, loading,
    fetchEmployees, fetchEmployee, createEmployee, updateEmployee, deleteEmployee,
  };
});
