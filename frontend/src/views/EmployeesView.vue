<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Employees</h1>
      <button
        v-if="authStore.hasRole('super_admin', 'hr_admin')"
        @click="showCreateModal = true"
        class="btn-primary"
      >
        + Add Employee
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="form-label">Search</label>
          <input v-model="filters.search" class="form-input" placeholder="Name, email, code..." @input="debouncedSearch" />
        </div>
        <div>
          <label class="form-label">Department</label>
          <select v-model="filters.department" class="form-input" @change="loadEmployees">
            <option value="">All</option>
            <option value="Engineering">Engineering</option>
            <option value="Design">Design</option>
            <option value="QA">QA</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
        <div>
          <label class="form-label">Status</label>
          <select v-model="filters.status" class="form-input" @change="loadEmployees">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        <div>
          <label class="form-label">Sort By</label>
          <select v-model="filters.sortBy" class="form-input" @change="loadEmployees">
            <option value="name">Name</option>
            <option value="department">Department</option>
            <option value="cost_per_hour">Cost/Hour</option>
            <option value="created_at">Date Added</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="store.loading" class="text-center py-8">
        <p class="text-gray-500">Loading...</p>
      </div>

      <div v-else>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Position</th>
                <th>Seniority</th>
                <th>Cost/Hour</th>
                <th>Capacity/Week</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in store.employees" :key="emp.id">
                <td>
                  <router-link :to="`/employees/${emp.id}`" class="font-medium text-primary-600 hover:underline">
                    {{ emp.name }}
                  </router-link>
                  <p class="text-xs text-gray-400">{{ emp.employee_code }} · {{ emp.email }}</p>
                </td>
                <td>{{ emp.department || '—' }}</td>
                <td>{{ emp.position || '—' }}</td>
                <td><span class="badge-info">{{ emp.seniority_level }}</span></td>
                <td class="font-mono">${{ parseFloat(emp.cost_per_hour).toFixed(2) }}</td>
                <td>{{ emp.capacity_per_week }}h</td>
                <td>
                  <span :class="emp.status === 'active' ? 'badge-success' : emp.status === 'on_leave' ? 'badge-warning' : 'badge-gray'">
                    {{ emp.status }}
                  </span>
                </td>
                <td>
                  <div class="flex space-x-2">
                    <button @click="editEmployee(emp)" class="text-sm text-primary-600 hover:underline">Edit</button>
                    <button
                      v-if="authStore.hasRole('super_admin', 'hr_admin')"
                      @click="confirmDelete(emp)"
                      class="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4">
          <p class="text-sm text-gray-500">
            Showing {{ store.employees.length }} of {{ store.pagination.total }} employees
          </p>
          <div class="flex space-x-2">
            <button
              @click="prevPage"
              :disabled="store.pagination.page <= 1"
              class="btn-secondary text-sm"
            >
              ← Previous
            </button>
            <button
              @click="nextPage"
              :disabled="store.pagination.page >= store.pagination.totalPages"
              class="btn-secondary text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-bold mb-4">{{ showEditModal ? 'Edit Employee' : 'Add Employee' }}</h2>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Name *</label>
              <input v-model="form.name" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Email *</label>
              <input v-model="form.email" type="email" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Employee Code</label>
              <input v-model="form.employee_code" class="form-input" />
            </div>
            <div>
              <label class="form-label">Department</label>
              <input v-model="form.department" class="form-input" />
            </div>
            <div>
              <label class="form-label">Position</label>
              <input v-model="form.position" class="form-input" />
            </div>
            <div>
              <label class="form-label">Cost/Hour *</label>
              <input v-model.number="form.cost_per_hour" type="number" min="0" step="0.01" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Capacity/Week (h)</label>
              <input v-model.number="form.capacity_per_week" type="number" min="0" class="form-input" />
            </div>
            <div>
              <label class="form-label">Seniority</label>
              <select v-model="form.seniority_level" class="form-input">
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="principal">Principal</option>
              </select>
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
import { useEmployeeStore } from '@/stores/employees.js';
import { useAuthStore } from '@/stores/auth.js';

const store = useEmployeeStore();
const authStore = useAuthStore();

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formError = ref('');

const filters = reactive({
  search: '',
  department: '',
  status: '',
  sortBy: 'name',
});

const form = reactive({
  name: '',
  email: '',
  employee_code: '',
  department: '',
  position: '',
  cost_per_hour: 0,
  capacity_per_week: 40,
  seniority_level: 'mid',
});

let searchTimeout;
function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadEmployees(), 300);
}

async function loadEmployees() {
  await store.fetchEmployees(filters);
}

function editEmployee(emp) {
  editingId.value = emp.id;
  Object.assign(form, {
    name: emp.name,
    email: emp.email,
    employee_code: emp.employee_code || '',
    department: emp.department || '',
    position: emp.position || '',
    cost_per_hour: parseFloat(emp.cost_per_hour),
    capacity_per_week: emp.capacity_per_week,
    seniority_level: emp.seniority_level,
  });
  showEditModal.value = true;
}

async function handleSave() {
  saving.value = true;
  formError.value = '';

  try {
    if (showEditModal.value) {
      await store.updateEmployee(editingId.value, { ...form });
    } else {
      await store.createEmployee({ ...form });
    }
    closeModal();
    await loadEmployees();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Failed to save';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(emp) {
  if (confirm(`Deactivate ${emp.name}? This action will set their status to inactive.`)) {
    try {
      await store.deleteEmployee(emp.id);
      await loadEmployees();
    } catch (err) {
      alert('Failed to deactivate: ' + (err.response?.data?.error?.message || err.message));
    }
  }
}

function closeModal() {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingId.value = null;
  Object.assign(form, {
    name: '', email: '', employee_code: '', department: '', position: '',
    cost_per_hour: 0, capacity_per_week: 40, seniority_level: 'mid',
  });
}

function prevPage() {
  if (store.pagination.page > 1) {
    store.pagination.page--;
    loadEmployees();
  }
}

function nextPage() {
  if (store.pagination.page < store.pagination.totalPages) {
    store.pagination.page++;
    loadEmployees();
  }
}

onMounted(loadEmployees);
</script>
