<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Timesheets</h1>
      <button @click="showCreateModal = true" class="btn-primary">+ Log Time</button>
    </div>

    <!-- Quick Add -->
    <div class="card mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Quick Add</h3>
      <form @submit.prevent="quickAdd" class="flex flex-wrap items-end gap-3">
        <div>
          <label class="form-label">Date</label>
          <input v-model="quickForm.date" type="date" class="form-input" required />
        </div>
        <div>
          <label class="form-label">Project</label>
          <select v-model="quickForm.project_id" class="form-input" required>
            <option value="" disabled>Select project</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Hours</label>
          <input v-model.number="quickForm.hours" type="number" min="0.25" max="24" step="0.25" class="form-input w-20" required />
        </div>
        <div class="flex-1 min-w-[200px]">
          <label class="form-label">Description</label>
          <input v-model="quickForm.description" class="form-input" placeholder="What did you work on?" />
        </div>
        <button type="submit" class="btn-primary" :disabled="quickSaving">
          {{ quickSaving ? 'Adding...' : 'Add' }}
        </button>
      </form>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="form-label">Start Date</label>
          <input v-model="filters.start_date" type="date" class="form-input" @change="loadTimesheets" />
        </div>
        <div>
          <label class="form-label">End Date</label>
          <input v-model="filters.end_date" type="date" class="form-input" @change="loadTimesheets" />
        </div>
        <div>
          <label class="form-label">Project</label>
          <select v-model="filters.project_id" class="form-input" @change="loadTimesheets">
            <option value="">All Projects</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Status</label>
          <select v-model="filters.status" class="form-input" @change="loadTimesheets">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div v-if="canApprove">
          <label class="form-label">Employee</label>
          <select v-model="filters.employee_id" class="form-input" @change="loadTimesheets">
            <option value="">All</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card">
        <p class="stat-label">Total Hours</p>
        <p class="stat-value">{{ summary.totalHours }}h</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Entries</p>
        <p class="stat-value">{{ store.pagination.total }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Pending Approval</p>
        <p class="stat-value text-yellow-600">{{ summary.pendingCount }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Approved</p>
        <p class="stat-value text-green-600">{{ summary.approvedCount }}</p>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="store.loading" class="text-center py-8 text-gray-500">Loading...</div>
      <div v-else>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th v-if="canApprove"><input type="checkbox" v-model="selectAll" @change="toggleSelectAll" /></th>
                <th>Date</th>
                <th>Employee</th>
                <th>Project</th>
                <th>Task</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ts in store.timesheets" :key="ts.id">
                <td v-if="canApprove">
                  <input type="checkbox" v-model="selectedIds" :value="ts.id" :disabled="ts.status !== 'submitted'" />
                </td>
                <td class="whitespace-nowrap">{{ formatDate(ts.date) }}</td>
                <td>{{ ts.employee?.name || '—' }}</td>
                <td>{{ ts.project?.name || '—' }}</td>
                <td>{{ ts.task?.name || '—' }}</td>
                <td class="font-mono">{{ ts.hours }}h</td>
                <td>
                  <span :class="statusBadge(ts.status)">{{ ts.status }}</span>
                </td>
                <td class="max-w-[200px] truncate text-sm text-gray-500">{{ ts.description }}</td>
                <td>
                  <div class="flex space-x-2 text-sm">
                    <button v-if="ts.status === 'draft'" @click="editTimesheet(ts)" class="text-primary-600 hover:underline">Edit</button>
                    <button
                      v-if="canApprove && ts.status === 'submitted'"
                      @click="approveOne(ts.id)"
                      class="text-green-600 hover:underline"
                    >Approve</button>
                    <button
                      v-if="canApprove && ts.status === 'submitted'"
                      @click="rejectOne(ts.id)"
                      class="text-red-600 hover:underline"
                    >Reject</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bulk Actions -->
        <div v-if="canApprove && selectedIds.length > 0" class="flex items-center space-x-3 mt-4 p-3 bg-primary-50 rounded-lg">
          <span class="text-sm font-medium">{{ selectedIds.length }} selected</span>
          <button @click="bulkApprove" class="btn-primary text-sm">Approve Selected</button>
          <button @click="bulkReject" class="btn-secondary text-sm">Reject Selected</button>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4">
          <p class="text-sm text-gray-500">
            {{ store.timesheets.length }} of {{ store.pagination.total }} entries
          </p>
          <div class="flex space-x-2">
            <button @click="prevPage" :disabled="store.pagination.page <= 1" class="btn-secondary text-sm">← Prev</button>
            <button @click="nextPage" :disabled="store.pagination.page >= store.pagination.totalPages" class="btn-secondary text-sm">Next →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <h2 class="text-lg font-bold mb-4">{{ showEditModal ? 'Edit Timesheet' : 'Log Time' }}</h2>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Date *</label>
              <input v-model="form.date" type="date" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Hours *</label>
              <input v-model.number="form.hours" type="number" min="0.25" max="24" step="0.25" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Project *</label>
              <select v-model="form.project_id" class="form-input" required>
                <option value="" disabled>Select project</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Type</label>
              <select v-model="form.activity_type" class="form-input">
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="testing">Testing</option>
                <option value="meeting">Meeting</option>
                <option value="review">Review</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="form-label">Description</label>
              <textarea v-model="form.description" class="form-input" rows="2"></textarea>
            </div>
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
import { useTimesheetStore } from '@/stores/timesheets.js';
import { useAuthStore } from '@/stores/auth.js';
import api from '@/services/api.js';
import dayjs from 'dayjs';

const store = useTimesheetStore();
const authStore = useAuthStore();

const canApprove = computed(() => authStore.hasRole('super_admin', 'hr_admin', 'project_manager'));

const projects = ref([]);
const employees = ref([]);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const quickSaving = ref(false);
const formError = ref('');
const selectAll = ref(false);
const selectedIds = ref([]);

const filters = reactive({
  start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
  end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
  project_id: '',
  status: '',
  employee_id: '',
});

const form = reactive({
  date: dayjs().format('YYYY-MM-DD'),
  hours: 1,
  project_id: '',
  activity_type: 'development',
  description: '',
});

const quickForm = reactive({
  date: dayjs().format('YYYY-MM-DD'),
  project_id: '',
  hours: 1,
  description: '',
});

const summary = computed(() => {
  const ts = store.timesheets;
  return {
    totalHours: ts.reduce((s, t) => s + parseFloat(t.hours || 0), 0).toFixed(1),
    pendingCount: ts.filter(t => t.status === 'submitted').length,
    approvedCount: ts.filter(t => t.status === 'approved').length,
  };
});

function statusBadge(s) {
  return { draft: 'badge-gray', submitted: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' }[s] || 'badge-gray';
}

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—'; }

async function loadTimesheets() {
  const params = {};
  Object.keys(filters).forEach(k => { if (filters[k]) params[k] = filters[k]; });
  await store.fetchTimesheets(params);
}

async function loadLookups() {
  try {
    const [pRes, eRes] = await Promise.all([
      api.get('/projects?limit=100'),
      canApprove.value ? api.get('/employees?limit=100') : Promise.resolve({ data: { data: [] } }),
    ]);
    projects.value = pRes.data.data || [];
    employees.value = eRes.data.data || [];
  } catch (err) {
    console.error('Failed to load lookups', err);
  }
}

async function quickAdd() {
  quickSaving.value = true;
  try {
    await store.createTimesheet({ ...quickForm, activity_type: 'development' });
    quickForm.hours = 1;
    quickForm.description = '';
    await loadTimesheets();
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Failed to add');
  } finally {
    quickSaving.value = false;
  }
}

function editTimesheet(ts) {
  editingId.value = ts.id;
  Object.assign(form, {
    date: dayjs(ts.date).format('YYYY-MM-DD'),
    hours: ts.hours,
    project_id: ts.project_id,
    activity_type: ts.activity_type || 'development',
    description: ts.description || '',
  });
  showEditModal.value = true;
}

async function handleSave() {
  saving.value = true;
  formError.value = '';
  try {
    if (showEditModal.value) {
      await store.updateTimesheet(editingId.value, { ...form });
    } else {
      await store.createTimesheet({ ...form });
    }
    closeModal();
    await loadTimesheets();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Failed to save';
  } finally {
    saving.value = false;
  }
}

async function approveOne(id) {
  try { await store.approveTimesheet(id, 'approved'); await loadTimesheets(); }
  catch (err) { alert('Failed: ' + (err.response?.data?.error?.message || err.message)); }
}

async function rejectOne(id) {
  const reason = prompt('Reason for rejection:');
  if (reason === null) return;
  try { await store.approveTimesheet(id, 'rejected', reason); await loadTimesheets(); }
  catch (err) { alert('Failed: ' + (err.response?.data?.error?.message || err.message)); }
}

async function bulkApprove() {
  for (const id of selectedIds.value) {
    try { await store.approveTimesheet(id, 'approved'); } catch {}
  }
  selectedIds.value = [];
  await loadTimesheets();
}

async function bulkReject() {
  const reason = prompt('Rejection reason:');
  if (reason === null) return;
  for (const id of selectedIds.value) {
    try { await store.approveTimesheet(id, 'rejected', reason); } catch {}
  }
  selectedIds.value = [];
  await loadTimesheets();
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = store.timesheets.filter(t => t.status === 'submitted').map(t => t.id);
  } else {
    selectedIds.value = [];
  }
}

function closeModal() {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingId.value = null;
  Object.assign(form, { date: dayjs().format('YYYY-MM-DD'), hours: 1, project_id: '', activity_type: 'development', description: '' });
}

function prevPage() { if (store.pagination.page > 1) { store.pagination.page--; loadTimesheets(); } }
function nextPage() { if (store.pagination.page < store.pagination.totalPages) { store.pagination.page++; loadTimesheets(); } }

onMounted(async () => {
  await loadLookups();
  await loadTimesheets();
});
</script>
