<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Projects</h1>
      <button
        v-if="authStore.hasRole('super_admin', 'hr_admin', 'project_manager')"
        @click="showCreateModal = true"
        class="btn-primary"
      >
        + New Project
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="form-label">Search</label>
          <input v-model="filters.search" class="form-input" placeholder="Name, code..." @input="debouncedSearch" />
        </div>
        <div>
          <label class="form-label">Status</label>
          <select v-model="filters.status" class="form-input" @change="loadProjects">
            <option value="">All</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label class="form-label">Sort By</label>
          <select v-model="filters.sortBy" class="form-input" @change="loadProjects">
            <option value="name">Name</option>
            <option value="start_date">Start Date</option>
            <option value="planned_hours">Planned Hours</option>
            <option value="created_at">Date Created</option>
          </select>
        </div>
        <div>
          <label class="form-label">Order</label>
          <select v-model="filters.sortOrder" class="form-input" @change="loadProjects">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Project Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6" v-if="!store.loading">
      <div v-for="project in store.projects" :key="project.id" class="card hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div>
            <router-link :to="`/projects/${project.id}`" class="text-lg font-bold text-primary-600 hover:underline">
              {{ project.name }}
            </router-link>
            <p class="text-xs text-gray-400">{{ project.code }}</p>
          </div>
          <span :class="statusBadge(project.status)">{{ project.status }}</span>
        </div>

        <p v-if="project.manager" class="text-xs text-gray-500 mb-1">PM: <strong>{{ project.manager.name }}</strong></p>
        <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ project.description || 'No description' }}</p>

        <!-- Budget Progress -->
        <div class="mb-3">
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>Hours Used</span>
            <span>{{ hoursUsed(project) }} / {{ project.planned_hours || '∞' }}h</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              :class="budgetBarColor(project)"
              class="h-2 rounded-full transition-all"
              :style="{ width: budgetPercent(project) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Info -->
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-500">
          <div>
            <p class="text-xs text-gray-400">Anggaran</p>
            <p class="font-medium">${{ formatMoney(project.planned_cost) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400">Period</p>
            <p class="font-medium">{{ formatDate(project.start_date) }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end mt-4 space-x-2">
          <button @click="editProject(project)" class="text-sm text-primary-600 hover:underline">Edit</button>
        </div>
      </div>
    </div>

    <div v-if="store.loading" class="text-center py-8 text-gray-500">Loading...</div>

    <!-- Pagination -->
    <div class="flex items-center justify-between" v-if="store.pagination.total > 0">
      <p class="text-sm text-gray-500">
        {{ store.projects.length }} of {{ store.pagination.total }} projects
      </p>
      <div class="flex space-x-2">
        <button @click="prevPage" :disabled="store.pagination.page <= 1" class="btn-secondary text-sm">← Prev</button>
        <button @click="nextPage" :disabled="store.pagination.page >= store.pagination.totalPages" class="btn-secondary text-sm">Next →</button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-bold mb-4">{{ showEditModal ? 'Edit Project' : 'Create Project' }}</h2>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="form-label">Name *</label>
              <input v-model="form.name" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Project Code</label>
              <input v-model="form.code" class="form-input" />
            </div>
            <div>
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-input">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="form-label">Penanggung Jawab (PM) *</label>
              <select v-model="form.project_manager_id" class="form-input" required>
                <option value="" disabled>Pilih PM</option>
                <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }} — {{ emp.position || emp.department || '' }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Target Jam Kerja</label>
              <input v-model.number="form.planned_hours" type="number" min="0" class="form-input" placeholder="Estimasi total jam" />
            </div>
            <div>
              <label class="form-label">Anggaran Biaya (Rp)</label>
              <input v-model.number="form.planned_cost" type="number" min="0" step="0.01" class="form-input" placeholder="Total budget" />
            </div>
            <div>
              <label class="form-label">Start Date</label>
              <input v-model="form.start_date" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">End Date</label>
              <input v-model="form.end_date" type="date" class="form-input" />
            </div>
            <div class="col-span-2">
              <label class="form-label">Description</label>
              <textarea v-model="form.description" class="form-input" rows="3"></textarea>
            </div>
          </div>

          <div v-if="formError" class="text-sm text-red-500">{{ formError }}</div>

          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useProjectStore } from '@/stores/projects.js';
import { useAuthStore } from '@/stores/auth.js';
import api from '@/services/api.js';
import dayjs from 'dayjs';

const store = useProjectStore();
const authStore = useAuthStore();

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formError = ref('');
const employees = ref([]);

const filters = reactive({ search: '', status: '', sortBy: 'name', sortOrder: 'asc' });

const form = reactive({
  name: '', code: '', description: '', status: 'planning',
  planned_hours: null, planned_cost: null, start_date: '', end_date: '',
  project_manager_id: '',
});

let searchTimeout;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadProjects(), 300);
}

async function loadProjects() {
  await store.fetchProjects(filters);
}

function statusBadge(s) {
  return { active: 'badge-success', planning: 'badge-info', on_hold: 'badge-warning', completed: 'badge-gray', cancelled: 'badge-danger' }[s] || 'badge-gray';
}

function hoursUsed(p) { return parseFloat(p.actual_hours || 0).toFixed(1); }

function budgetPercent(p) {
  if (!p.planned_hours) return 0;
  return Math.min(100, (parseFloat(p.actual_hours || 0) / p.planned_hours) * 100);
}

function budgetBarColor(p) {
  const pct = budgetPercent(p);
  if (pct > 90) return 'bg-red-500';
  if (pct > 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—'; }
function formatMoney(v) { return v ? parseFloat(v).toLocaleString() : '0'; }

function editProject(proj) {
  editingId.value = proj.id;
  Object.assign(form, {
    name: proj.name, code: proj.code, description: proj.description || '',
    status: proj.status, planned_hours: proj.planned_hours, planned_cost: proj.planned_cost,
    start_date: proj.start_date ? dayjs(proj.start_date).format('YYYY-MM-DD') : '',
    end_date: proj.end_date ? dayjs(proj.end_date).format('YYYY-MM-DD') : '',
    project_manager_id: proj.project_manager_id || '',
  });
  showEditModal.value = true;
}

async function handleSave() {
  saving.value = true;
  formError.value = '';
  try {
    if (showEditModal.value) {
      await store.updateProject(editingId.value, { ...form });
    } else {
      await store.createProject({ ...form });
    }
    closeModal();
    await loadProjects();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Failed to save';
  } finally {
    saving.value = false;
  }
}

function closeModal() {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingId.value = null;
  Object.assign(form, { name: '', code: '', description: '', status: 'planning', planned_hours: null, planned_cost: null, start_date: '', end_date: '', project_manager_id: '' });
}

async function loadEmployees() {
  try {
    const { data } = await api.get('/employees?limit=100');
    employees.value = data.data || [];
  } catch (err) {
    console.error('Failed to load employees', err);
  }
}

function prevPage() { if (store.pagination.page > 1) { store.pagination.page--; loadProjects(); } }
function nextPage() { if (store.pagination.page < store.pagination.totalPages) { store.pagination.page++; loadProjects(); } }

onMounted(async () => {
  await Promise.all([loadProjects(), loadEmployees()]);
});
</script>
