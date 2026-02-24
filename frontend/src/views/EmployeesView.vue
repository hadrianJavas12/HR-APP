<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Pegawai</h1>
      <button
        v-if="authStore.hasRole('super_admin', 'hr_admin')"
        @click="openCreateModal"
        class="btn-primary"
      >
        + Tambah Pegawai
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="form-label">Cari</label>
          <input v-model="filters.search" class="form-input" placeholder="Nama, email, ID..." @input="debouncedSearch" />
        </div>
        <div>
          <label class="form-label">Departemen</label>
          <select v-model="filters.department" class="form-input" @change="loadEmployees">
            <option value="">Semua</option>
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
            <option value="">Semua</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="on_leave">Cuti</option>
          </select>
        </div>
        <div>
          <label class="form-label">Urutkan</label>
          <select v-model="filters.sortBy" class="form-input" @change="loadEmployees">
            <option value="name">Nama</option>
            <option value="department">Departemen</option>
            <option value="cost_per_hour">Bayaran/Jam</option>
            <option value="created_at">Tanggal Ditambahkan</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="store.loading" class="text-center py-8">
        <p class="text-gray-500">Memuat...</p>
      </div>

      <div v-else>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pegawai</th>
                <th>ID Akun</th>
                <th>Departemen</th>
                <th>Jabatan</th>
                <th>Level</th>
                <th>Bayaran/Jam</th>
                <th>Kapasitas/Minggu</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in store.employees" :key="emp.id">
                <td>
                  <router-link :to="`/employees/${emp.id}`" class="font-medium text-primary-600 hover:underline">
                    {{ emp.name }}
                  </router-link>
                  <p class="text-xs text-gray-400">{{ emp.email }}</p>
                </td>
                <td>
                  <span v-if="emp.user_id" class="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {{ emp.user_id.substring(0, 8) }}...
                  </span>
                  <span v-else class="text-xs text-gray-400">Belum terhubung</span>
                </td>
                <td>{{ emp.department || '—' }}</td>
                <td>{{ emp.position || '—' }}</td>
                <td><span class="badge-info">{{ emp.seniority_level }}</span></td>
                <td class="font-mono">Rp {{ parseFloat(emp.cost_per_hour).toLocaleString() }}</td>
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
                      Hapus
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
            Menampilkan {{ store.employees.length }} dari {{ store.pagination.total }} pegawai
          </p>
          <div class="flex space-x-2">
            <button
              @click="prevPage"
              :disabled="store.pagination.page <= 1"
              class="btn-secondary text-sm"
            >
              ← Sebelumnya
            </button>
            <button
              @click="nextPage"
              :disabled="store.pagination.page >= store.pagination.totalPages"
              class="btn-secondary text-sm"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-bold mb-4">{{ showEditModal ? 'Edit Pegawai' : 'Tambah Pegawai' }}</h2>

        <form @submit.prevent="handleSave" class="space-y-4">
          <!-- Link to User Account -->
          <div class="p-3 bg-blue-50 rounded-lg">
            <label class="form-label text-blue-800">Hubungkan ke Akun (Employee ID)</label>
            <select v-model="form.user_id" class="form-input" @change="onUserSelected">
              <option value="">-- Tidak Terhubung --</option>
              <option v-for="u in unlinkedUsers" :key="u.id" :value="u.id">
                {{ u.name }} ({{ u.email }}) — ID: {{ u.id.substring(0, 8) }}...
              </option>
            </select>
            <p class="text-xs text-blue-600 mt-1">
              Pilih akun terdaftar untuk menghubungkan pegawai dengan ID akun. Akun baru dapat dibuat di halaman Daftar.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Nama *</label>
              <input v-model="form.name" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Email *</label>
              <input v-model="form.email" type="email" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Departemen</label>
              <input v-model="form.department" class="form-input" />
            </div>
            <div>
              <label class="form-label">Jabatan</label>
              <input v-model="form.position" class="form-input" />
            </div>
            <div>
              <label class="form-label">Bayaran/Jam (Rp) *</label>
              <input v-model.number="form.cost_per_hour" type="number" min="0" step="0.01" class="form-input" required />
            </div>
            <div>
              <label class="form-label">Kapasitas/Minggu (jam)</label>
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
            <button type="button" @click="closeModal" class="btn-secondary">Batal</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
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
import api from '@/services/api.js';

const store = useEmployeeStore();
const authStore = useAuthStore();

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingId = ref(null);
const saving = ref(false);
const formError = ref('');
const unlinkedUsers = ref([]);

const filters = reactive({
  search: '',
  department: '',
  status: '',
  sortBy: 'name',
});

const form = reactive({
  user_id: '',
  name: '',
  email: '',
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

async function loadUnlinkedUsers() {
  try {
    const { data } = await api.get('/employees/unlinked-users');
    unlinkedUsers.value = data.data || [];
  } catch (err) {
    console.error('Failed to load unlinked users', err);
    unlinkedUsers.value = [];
  }
}

function onUserSelected() {
  if (form.user_id) {
    const selectedUser = unlinkedUsers.value.find(u => u.id === form.user_id);
    if (selectedUser) {
      form.name = selectedUser.name;
      form.email = selectedUser.email;
    }
  }
}

async function openCreateModal() {
  await loadUnlinkedUsers();
  showCreateModal.value = true;
}

function editEmployee(emp) {
  editingId.value = emp.id;
  Object.assign(form, {
    user_id: emp.user_id || '',
    name: emp.name,
    email: emp.email,
    department: emp.department || '',
    position: emp.position || '',
    cost_per_hour: parseFloat(emp.cost_per_hour),
    capacity_per_week: emp.capacity_per_week,
    seniority_level: emp.seniority_level,
  });
  // Load unlinked users + include currently linked user
  loadUnlinkedUsers().then(() => {
    if (emp.user_id) {
      const alreadyInList = unlinkedUsers.value.find(u => u.id === emp.user_id);
      if (!alreadyInList) {
        unlinkedUsers.value.unshift({
          id: emp.user_id,
          name: emp.name,
          email: emp.email,
          role: 'employee',
        });
      }
    }
  });
  showEditModal.value = true;
}

async function handleSave() {
  saving.value = true;
  formError.value = '';

  try {
    const payload = { ...form };
    if (!payload.user_id) delete payload.user_id;

    if (showEditModal.value) {
      await store.updateEmployee(editingId.value, payload);
    } else {
      await store.createEmployee(payload);
    }
    closeModal();
    await loadEmployees();
  } catch (err) {
    formError.value = err.response?.data?.error?.message || 'Gagal menyimpan';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(emp) {
  if (confirm(`Nonaktifkan ${emp.name}? Tindakan ini akan mengubah status menjadi nonaktif.`)) {
    try {
      await store.deleteEmployee(emp.id);
      await loadEmployees();
    } catch (err) {
      alert('Gagal menonaktifkan: ' + (err.response?.data?.error?.message || err.message));
    }
  }
}

function closeModal() {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingId.value = null;
  Object.assign(form, {
    user_id: '', name: '', email: '', department: '', position: '',
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
