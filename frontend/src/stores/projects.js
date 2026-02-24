import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api.js';

export const useProjectStore = defineStore('projects', () => {
  const projects = ref([]);
  const currentProject = ref(null);
  const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const loading = ref(false);

  async function fetchProjects(query = {}) {
    loading.value = true;
    try {
      const params = { page: pagination.value.page, limit: pagination.value.limit, ...query };
      const { data } = await api.get('/projects', { params });
      projects.value = data.data;
      pagination.value = data.pagination;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProject(id) {
    loading.value = true;
    try {
      const { data } = await api.get(`/projects/${id}`);
      currentProject.value = data.data;
      return data.data;
    } finally {
      loading.value = false;
    }
  }

  async function createProject(payload) {
    const { data } = await api.post('/projects', payload);
    return data.data;
  }

  async function updateProject(id, payload) {
    const { data } = await api.put(`/projects/${id}`, payload);
    return data.data;
  }

  async function deleteProject(id) {
    await api.delete(`/projects/${id}`);
  }

  return {
    projects, currentProject, pagination, loading,
    fetchProjects, fetchProject, createProject, updateProject, deleteProject,
  };
});
