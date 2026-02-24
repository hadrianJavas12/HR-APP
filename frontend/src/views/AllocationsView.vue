<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Resource Allocations</h1>
      <button
        v-if="authStore.hasRole('super_admin', 'hr_admin', 'project_manager')"
        @click="showCreateModal = true"
        class="btn-primary"
      >
        + Allocate Resource
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="form-label">Employee</label>
          <select v-model="filters.employee_id" class="form-input" @change="loadAllocations">
            <option value="">All Employees</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Project</label>
          <select v-model="filters.project_id" class="form-input" @change="loadAllocations">
            <option value="">All Projects</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Status</label>
          <select v-model="filters.status" class="form-input" @change="loadAllocations">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label class="form-label">Sort</label>
          <select v-model="filters.sortBy" class="form-input" @change="loadAllocations">
            <option value="start_date">Start Date</option>
            <option value="allocation_percentage">Allocation %</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="loading" class="text-center py-8 text-gray-500">Loading...</div>
      <div v-else>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Project</th>
                <th>Allocation %</th>
                <th>Hours/Week</th>
                <th>Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="alloc in allocations" :key="alloc.id">
                <td>
                  <router-link :to="`/employees/${alloc.employee_id}`" class="text-primary-600 hover:underline">
                    {{ alloc.employee?.name || alloc.employee_id }}
                  </router-link>
                </td>
                <td>
                  <router-link :to="`/projects/${alloc.project_id}`" class="text-primary-600 hover:underline">
                    {{ alloc.project?.name || alloc.project_id }}
                  </router-link>
                </td>
                <td>
                  <div class="flex items-center space-x-2">
                    <div class="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        class="bg-primary-500 h-2 rounded-full"
                        :style="{ width: Math.min(100, alloc.allocation_percentage) + '%' }"
                      ></div>
                    </div>
                    <span class="text-sm font-medium">{{ alloc.allocation_percentage }}%</span>
                  </div>
                </td>
                <td>{{ alloc.hours_per_week }}h</td>
                <td class="text-sm">
                  {{ formatDate(alloc.start_date) }} — {{ formatDate(alloc.end_date) }}
                </td>
                <td>
                  <span :class="alloc.status === 'active' ? 'badge-success' : alloc.status === 'planned' ? 'badge-info' : 'badge-gray'">
                    {{ alloc.status }}
                  </span>
                </td>
                <td>
                  <div class="flex space-x-2 text-sm">
                    <button @click="editAllocation(alloc)" class="text-primary-600 hover:underline">Edit</button>
                    <button @click="deleteAllocation(alloc)" class="text-red-600 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between mt-4">
          <p class="text-sm text-gray-500">{{ allocations.length }} allocations</p>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <h2 class="text-lg font-bold mb-4">{{ showEditModal ? 'Edit Allocation' : 'Allocate Resource' }}</h2>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Employee *</label>
              <select v-model="form.employee_id" class="form-input" required>
                <option value="" disabled>Select</option>
                <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Project *</label>
              <select v-model="form.project_id" class="form-input" required>
                <option value="" disabled>Select</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Allocation % *</label>
              <input v-model.number="form.allocation_percentage" type="number" min="1" max="100" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Hours/Week *</label>
              <input v-model.number="form.hours_per_week" type="number" min="1" max="80" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Start Date *</label>
              <input v-model="form.start_date" type="date" class="form-input" required />
            </div>
            <div>
              <label class="form-label">End Date *</label>
              <input v-model="form.end_date" type="date" class="form-input" required />
            </div>
          </div>

          <div v-if="capacityWarning" class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
            ⚠ This employee will be allocated over 100% capacity in the overlapping period.
          </div>

          <div v-if="formError" class="text-sm text-red-500">{{ formError }}</div>

          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';
import api from '@/services/api.js';
import dayjs from 'dayjs';

const authStore = useAuthStore();

const loading = ref(true);
const allocations = ref([]);
const employees = ref([]);
const projects = ref([]);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formError = ref('');

const filters = reactive({ employee_id: '', project_id: '', status: '', sortBy: 'start_date' });

const form = reactive({
  employee_id: '', project_id: '',
  allocation_percentage: 100, hours_per_week: 40,
  start_date: '', end_date: '',
});

const capacityWarning = computed(() => form.allocation_percentage > 100);

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—'; }

async function loadAllocations() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(k => { if (filters[k]) params.set(k, filters[k]); });
    const res = await api.get(`/allocations?${params}`);
    allocations.value = res.data.data || [];
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function loadLookups() {
  try {
    const [eRes, pRes] = await Promise.all([
      api.get('/employees?limit=200'),
      api.get('/projects?limit=200'),
    ]);
    employees.value = eRes.data.data || [];
    projects.value = pRes.data.data || [];
  } catch (err) {
    console.error(err);
  }
}

function editAllocation(a) {
  editingId.value = a.id;
  Object.assign(form, {
    employee_id: a.employee_id, project_id: a.project_id,
    allocation_percentage: a.allocation_percentage, hours_per_week: a.hours_per_week,
    start_date: dayjs(a.start_date).format('YYYY-MM-DD'),
    end_date: dayjs(a.end_date).format('YYYY-MM-DD'),
  });
  showEditModal.value = true;
}

async function handleSave() {
  saving.value = true;
  formError.value = '';
  try {
    if (showEditModal.value) {
      await api.put(`/allocations/${editingId.value}`, form);
    } else {
      await api.post('/allocations', form);
    }
    closeModal();
    await loadAllocations();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Failed to save';
  } finally {
    saving.value = false;
  }
}

async function deleteAllocation(a) {
  if (!confirm(`Remove ${a.employee?.name}'s allocation from ${a.project?.name}?`)) return;
  try {
    await api.delete(`/allocations/${a.id}`);
    await loadAllocations();
  } catch (err) {
    alert('Failed to delete: ' + (err.response?.data?.error?.message || err.message));
  }
}

function closeModal() {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingId.value = null;
  Object.assign(form, { employee_id: '', project_id: '', allocation_percentage: 100, hours_per_week: 40, start_date: '', end_date: '' });
}

onMounted(async () => {
  await loadLookups();
  await loadAllocations();
});
</script>
