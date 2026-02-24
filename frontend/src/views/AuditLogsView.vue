<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="form-label">Action</label>
          <select v-model="filters.action" class="form-input" @change="loadLogs">
            <option value="">All</option>
            <option value="login">Login</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
        </div>
        <div>
          <label class="form-label">Entity</label>
          <select v-model="filters.entity_type" class="form-input" @change="loadLogs">
            <option value="">All</option>
            <option value="user">User</option>
            <option value="employee">Employee</option>
            <option value="project">Project</option>
            <option value="timesheet">Timesheet</option>
            <option value="allocation">Allocation</option>
          </select>
        </div>
        <div>
          <label class="form-label">Start Date</label>
          <input v-model="filters.start_date" type="date" class="form-input" @change="loadLogs" />
        </div>
        <div>
          <label class="form-label">End Date</label>
          <input v-model="filters.end_date" type="date" class="form-input" @change="loadLogs" />
        </div>
        <div>
          <label class="form-label">User ID</label>
          <input v-model="filters.user_id" class="form-input" placeholder="UUID" @change="loadLogs" />
        </div>
      </div>
    </div>

    <!-- Log Table -->
    <div class="card">
      <div v-if="loading" class="text-center py-8 text-gray-500">Loading...</div>
      <div v-else>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td class="whitespace-nowrap text-sm">{{ formatTimestamp(log.created_at) }}</td>
                <td>{{ log.user?.username || log.user_id || '—' }}</td>
                <td>
                  <span :class="actionBadge(log.action)">{{ log.action }}</span>
                </td>
                <td>{{ log.entity_type }}</td>
                <td class="font-mono text-xs text-gray-400">{{ shortId(log.entity_id) }}</td>
                <td>
                  <button
                    v-if="log.old_values || log.new_values"
                    @click="showDetails(log)"
                    class="text-sm text-primary-600 hover:underline"
                  >
                    View Changes
                  </button>
                  <span v-else class="text-sm text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between mt-4">
          <p class="text-sm text-gray-500">{{ pagination.total }} log entries</p>
          <div class="flex space-x-2">
            <button @click="prevPage" :disabled="pagination.page <= 1" class="btn-secondary text-sm">← Prev</button>
            <button @click="nextPage" :disabled="pagination.page >= pagination.totalPages" class="btn-secondary text-sm">Next →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="detailLog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">Change Details</h3>
          <button @click="detailLog = null" class="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 class="font-semibold text-red-600 mb-2">Old Values</h4>
            <pre class="bg-red-50 p-3 rounded-lg text-xs overflow-auto max-h-60">{{ formatJson(detailLog.old_values) }}</pre>
          </div>
          <div>
            <h4 class="font-semibold text-green-600 mb-2">New Values</h4>
            <pre class="bg-green-50 p-3 rounded-lg text-xs overflow-auto max-h-60">{{ formatJson(detailLog.new_values) }}</pre>
          </div>
        </div>
        <div class="mt-4 text-xs text-gray-400">
          <p>Action: {{ detailLog.action }} | Entity: {{ detailLog.entity_type }} | ID: {{ detailLog.entity_id }}</p>
          <p>IP: {{ detailLog.ip_address }} | User Agent: {{ detailLog.user_agent }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/services/api.js';
import dayjs from 'dayjs';

const loading = ref(true);
const logs = ref([]);
const detailLog = ref(null);

const pagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 0 });

const filters = reactive({
  action: '',
  entity_type: '',
  start_date: '',
  end_date: '',
  user_id: '',
});

function formatTimestamp(t) { return dayjs(t).format('DD MMM YYYY HH:mm:ss'); }

function shortId(id) { return id ? id.substring(0, 8) + '...' : '—'; }

function actionBadge(a) {
  return {
    login: 'badge-info', create: 'badge-success', update: 'badge-warning',
    delete: 'badge-danger', approve: 'badge-success', reject: 'badge-danger',
  }[a] || 'badge-gray';
}

function formatJson(obj) {
  if (!obj) return '—';
  try { return JSON.stringify(obj, null, 2); }
  catch { return String(obj); }
}

function showDetails(log) { detailLog.value = log; }

async function loadLogs() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', pagination.page);
    params.set('limit', pagination.limit);
    Object.keys(filters).forEach(k => { if (filters[k]) params.set(k, filters[k]); });
    const res = await api.get(`/audit-logs?${params}`);
    logs.value = res.data.data || [];
    if (res.data.pagination) {
      pagination.total = res.data.pagination.total;
      pagination.totalPages = res.data.pagination.totalPages;
    }
  } catch (err) {
    console.error('Failed to load audit logs', err);
  } finally {
    loading.value = false;
  }
}

function prevPage() { if (pagination.page > 1) { pagination.page--; loadLogs(); } }
function nextPage() { if (pagination.page < pagination.totalPages) { pagination.page++; loadLogs(); } }

onMounted(loadLogs);
</script>
