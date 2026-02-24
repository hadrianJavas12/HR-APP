<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Timesheet</h1>
      <button @click="showCreateModal = true" class="btn-primary">+ Catat Waktu</button>
    </div>

    <!-- Employee Info Banner -->
    <div v-if="myEmployee" class="card mb-4 bg-blue-50 border border-blue-200">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-blue-800">
            Login sebagai: <strong>{{ authStore.userName }}</strong>
            (ID Akun: <span class="font-mono">{{ authStore.user?.id?.substring(0, 8) }}...</span>)
          </p>
          <p class="text-xs text-blue-600">
            Pegawai: {{ myEmployee.name }} — {{ myEmployee.department || 'No Dept' }} · {{ myEmployee.position || 'No Position' }}
          </p>
        </div>
      </div>
    </div>
    <div v-else-if="!canApprove" class="card mb-4 bg-yellow-50 border border-yellow-200">
      <p class="text-sm text-yellow-800">
        Akun Anda belum terhubung dengan data pegawai. Hubungi Admin/HR untuk menghubungkan akun Anda agar bisa mencatat waktu.
      </p>
    </div>

    <!-- Quick Add -->
    <div class="card mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Catat Cepat</h3>
      <form @submit.prevent="quickAdd" class="flex flex-wrap items-end gap-3">
        <div>
          <label class="form-label">Tanggal</label>
          <input v-model="quickForm.date" type="date" class="form-input" required />
        </div>
        <div>
          <label class="form-label">Proyek</label>
          <select v-model="quickForm.project_id" class="form-input" required>
            <option value="" disabled>Pilih proyek</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Jam</label>
          <input v-model.number="quickForm.hours" type="number" min="0.25" max="24" step="0.25" class="form-input w-20" required />
        </div>
        <div class="flex-1 min-w-[200px]">
          <label class="form-label">Catatan</label>
          <input v-model="quickForm.notes" class="form-input" placeholder="Apa yang dikerjakan?" />
        </div>
        <button type="submit" class="btn-primary" :disabled="quickSaving || (!myEmployee && !canApprove)">
          {{ quickSaving ? 'Menambahkan...' : 'Tambah' }}
        </button>
      </form>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="form-label">Dari Tanggal</label>
          <input v-model="filters.date_from" type="date" class="form-input" @change="loadTimesheets" />
        </div>
        <div>
          <label class="form-label">Sampai Tanggal</label>
          <input v-model="filters.date_to" type="date" class="form-input" @change="loadTimesheets" />
        </div>
        <div>
          <label class="form-label">Proyek</label>
          <select v-model="filters.project_id" class="form-input" @change="loadTimesheets">
            <option value="">Semua Proyek</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Status</label>
          <select v-model="filters.approval_status" class="form-input" @change="loadTimesheets">
            <option value="">Semua</option>
            <option value="pending">Pending</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
        <div v-if="canApprove">
          <label class="form-label">Pegawai</label>
          <select v-model="filters.employee_id" class="form-input" @change="loadTimesheets">
            <option value="">Semua</option>
            <option v-for="e in employeeList" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card">
        <p class="stat-label">Total Jam</p>
        <p class="stat-value">{{ summary.totalHours }}h</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Entri</p>
        <p class="stat-value">{{ store.pagination.total }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Menunggu Persetujuan</p>
        <p class="stat-value text-yellow-600">{{ summary.pendingCount }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Disetujui</p>
        <p class="stat-value text-green-600">{{ summary.approvedCount }}</p>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="store.loading" class="text-center py-8 text-gray-500">Memuat...</div>
      <div v-else>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th v-if="canApprove"><input type="checkbox" v-model="selectAll" @change="toggleSelectAll" /></th>
                <th>Tanggal</th>
                <th>Pegawai</th>
                <th>Proyek</th>
                <th>Task</th>
                <th>Jam</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Catatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ts in store.timesheets" :key="ts.id">
                <td v-if="canApprove">
                  <input type="checkbox" v-model="selectedIds" :value="ts.id" :disabled="ts.approval_status !== 'pending' || !canApproveRow(ts)" />
                </td>
                <td class="whitespace-nowrap">{{ formatDate(ts.date) }}</td>
                <td>{{ ts.employee?.name || '—' }}</td>
                <td>{{ ts.project?.name || '—' }}</td>
                <td>{{ ts.task?.name || '—' }}</td>
                <td class="font-mono">{{ ts.hours }}h</td>
                <td>
                  <span class="badge-info text-xs">{{ ts.mode }}</span>
                </td>
                <td>
                  <span :class="statusBadge(ts.approval_status)">{{ statusLabel(ts.approval_status) }}</span>
                </td>
                <td class="max-w-[200px] truncate text-sm text-gray-500">{{ ts.notes }}</td>
                <td>
                  <div class="flex space-x-2 text-sm">
                    <button v-if="ts.approval_status === 'pending'" @click="editTimesheet(ts)" class="text-primary-600 hover:underline">Edit</button>
                    <button
                      v-if="canApproveRow(ts) && ts.approval_status === 'pending'"
                      @click="approveOne(ts.id)"
                      class="text-green-600 hover:underline"
                    >Setujui</button>
                    <button
                      v-if="canApproveRow(ts) && ts.approval_status === 'pending'"
                      @click="rejectOne(ts.id)"
                      class="text-red-600 hover:underline"
                    >Tolak</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bulk Actions -->
        <div v-if="canApprove && selectedIds.length > 0" class="flex items-center space-x-3 mt-4 p-3 bg-primary-50 rounded-lg">
          <span class="text-sm font-medium">{{ selectedIds.length }} dipilih</span>
          <button @click="bulkApprove" class="btn-primary text-sm">Setujui Terpilih</button>
          <button @click="bulkReject" class="btn-secondary text-sm">Tolak Terpilih</button>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4">
          <p class="text-sm text-gray-500">
            {{ store.timesheets.length }} dari {{ store.pagination.total }} entri
          </p>
          <div class="flex space-x-2">
            <button @click="prevPage" :disabled="store.pagination.page <= 1" class="btn-secondary text-sm">← Sebelumnya</button>
            <button @click="nextPage" :disabled="store.pagination.page >= store.pagination.totalPages" class="btn-secondary text-sm">Selanjutnya →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <h2 class="text-lg font-bold mb-4">{{ showEditModal ? 'Edit Timesheet' : 'Catat Waktu' }}</h2>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Tanggal *</label>
              <input v-model="form.date" type="date" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Jam *</label>
              <input v-model.number="form.hours" type="number" min="0.25" max="24" step="0.25" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Proyek *</label>
              <select v-model="form.project_id" class="form-input" required>
                <option value="" disabled>Pilih proyek</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Mode</label>
              <select v-model="form.mode" class="form-input">
                <option value="normal">Normal</option>
                <option value="overtime">Lembur</option>
                <option value="holiday">Hari Libur</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="form-label">Catatan</label>
              <textarea v-model="form.notes" class="form-input" rows="2" placeholder="Apa yang dikerjakan?"></textarea>
            </div>
          </div>
          <div v-if="formError" class="text-sm text-red-500">{{ formError }}</div>
          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" @click="closeModal" class="btn-secondary">Batal</button>
            <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
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

function canApproveRow(ts) {
  if (authStore.hasRole('super_admin', 'hr_admin')) return true;
  if (authStore.hasRole('project_manager') && myEmployee.value && ts.project) {
    return ts.project.project_manager_id === myEmployee.value.id;
  }
  return false;
}

const projects = ref([]);
const employeeList = ref([]);
const myEmployee = ref(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const quickSaving = ref(false);
const formError = ref('');
const selectAll = ref(false);
const selectedIds = ref([]);

const filters = reactive({
  date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
  date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
  project_id: '',
  approval_status: '',
  employee_id: '',
});

const form = reactive({
  date: dayjs().format('YYYY-MM-DD'),
  hours: 1,
  project_id: '',
  mode: 'normal',
  notes: '',
});

const quickForm = reactive({
  date: dayjs().format('YYYY-MM-DD'),
  project_id: '',
  hours: 1,
  notes: '',
});

const summary = computed(() => {
  const ts = store.timesheets;
  return {
    totalHours: ts.reduce((s, t) => s + parseFloat(t.hours || 0), 0).toFixed(1),
    pendingCount: ts.filter(t => t.approval_status === 'pending').length,
    approvedCount: ts.filter(t => t.approval_status === 'approved').length,
  };
});

function statusBadge(s) {
  return { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' }[s] || 'badge-gray';
}

function statusLabel(s) {
  return { pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak' }[s] || s;
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
    employeeList.value = eRes.data.data || [];
  } catch (err) {
    console.error('Failed to load lookups', err);
  }
}

async function resolveMyEmployee() {
  try {
    const { data } = await api.get('/employees/me');
    myEmployee.value = data.data || null;
  } catch (err) {
    console.error('Failed to resolve employee', err);
  }
}

async function quickAdd() {
  quickSaving.value = true;
  try {
    const payload = {
      date: quickForm.date,
      project_id: quickForm.project_id,
      hours: quickForm.hours,
      notes: quickForm.notes || null,
      mode: 'normal',
    };
    if (myEmployee.value) {
      payload.employee_id = myEmployee.value.id;
    }
    await store.createTimesheet(payload);
    quickForm.hours = 1;
    quickForm.notes = '';
    await loadTimesheets();
  } catch (err) {
    alert(err.response?.data?.error?.message || 'Gagal menambahkan');
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
    mode: ts.mode || 'normal',
    notes: ts.notes || '',
  });
  showEditModal.value = true;
}

async function handleSave() {
  saving.value = true;
  formError.value = '';
  try {
    const payload = {
      date: form.date,
      hours: form.hours,
      project_id: form.project_id,
      mode: form.mode,
      notes: form.notes || null,
    };
    if (showEditModal.value) {
      await store.updateTimesheet(editingId.value, payload);
    } else {
      if (myEmployee.value) {
        payload.employee_id = myEmployee.value.id;
      }
      await store.createTimesheet(payload);
    }
    closeModal();
    await loadTimesheets();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Gagal menyimpan';
  } finally {
    saving.value = false;
  }
}

async function approveOne(id) {
  try { await store.approveTimesheet(id, 'approved'); await loadTimesheets(); }
  catch (err) { alert('Gagal: ' + (err.response?.data?.error?.message || err.message)); }
}

async function rejectOne(id) {
  const reason = prompt('Alasan penolakan:');
  if (reason === null) return;
  try { await store.approveTimesheet(id, 'rejected', reason); await loadTimesheets(); }
  catch (err) { alert('Gagal: ' + (err.response?.data?.error?.message || err.message)); }
}

async function bulkApprove() {
  for (const id of selectedIds.value) {
    try { await store.approveTimesheet(id, 'approved'); } catch {}
  }
  selectedIds.value = [];
  await loadTimesheets();
}

async function bulkReject() {
  const reason = prompt('Alasan penolakan:');
  if (reason === null) return;
  for (const id of selectedIds.value) {
    try { await store.approveTimesheet(id, 'rejected', reason); } catch {}
  }
  selectedIds.value = [];
  await loadTimesheets();
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = store.timesheets.filter(t => t.approval_status === 'pending' && canApproveRow(t)).map(t => t.id);
  } else {
    selectedIds.value = [];
  }
}

function closeModal() {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingId.value = null;
  Object.assign(form, { date: dayjs().format('YYYY-MM-DD'), hours: 1, project_id: '', mode: 'normal', notes: '' });
}

function prevPage() { if (store.pagination.page > 1) { store.pagination.page--; loadTimesheets(); } }
function nextPage() { if (store.pagination.page < store.pagination.totalPages) { store.pagination.page++; loadTimesheets(); } }

onMounted(async () => {
  await Promise.all([loadLookups(), resolveMyEmployee()]);
  await loadTimesheets();
});
</script>
