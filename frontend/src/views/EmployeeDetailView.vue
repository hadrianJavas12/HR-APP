<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/employees" class="text-primary-600 hover:underline mr-3">← Kembali</router-link>
      <h1 class="text-2xl font-bold text-gray-900">Detail Pegawai</h1>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">Memuat...</div>

    <template v-else-if="employee">
      <!-- Header Card -->
      <div class="card mb-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-bold">{{ employee.name }}</h2>
            <p class="text-gray-500">{{ employee.employee_code }} · {{ employee.email }}</p>
            <div class="flex items-center space-x-3 mt-2">
              <span :class="employee.status === 'active' ? 'badge-success' : 'badge-gray'">{{ employee.status }}</span>
              <span class="badge-info">{{ employee.seniority_level }}</span>
              <span class="text-sm text-gray-500">{{ employee.department }} — {{ employee.position }}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-primary-600">Rp {{ parseFloat(employee.cost_per_hour).toLocaleString() }}/jam</p>
            <p class="text-sm text-gray-400">Kapasitas: {{ employee.capacity_per_week }}j/minggu</p>
          </div>
        </div>
      </div>

      <!-- Period Selector -->
      <div class="flex items-center space-x-4 mb-6">
        <label class="form-label mb-0">Periode:</label>
        <input v-model="startDate" type="date" class="form-input w-auto" @change="loadData" />
        <span class="text-gray-400">to</span>
        <input v-model="endDate" type="date" class="form-input w-auto" @change="loadData" />
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="stat-card">
          <p class="stat-label">Total Jam</p>
          <p class="stat-value">{{ kpis.totalHours }}h</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Jam Billable</p>
          <p class="stat-value">{{ kpis.billableHours }}h</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Utilisasi</p>
          <p class="stat-value" :class="utilizationColor">{{ kpis.utilization }}%</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Total Biaya</p>
          <p class="stat-value">Rp {{ kpis.totalCost }}</p>
        </div>
      </div>

      <!-- Project Allocations -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Alokasi Saat Ini</h3>
          <table class="data-table" v-if="allocations.length">
            <thead><tr><th>Proyek</th><th>Alokasi %</th><th>Jam/Minggu</th><th>Periode</th></tr></thead>
            <tbody>
              <tr v-for="a in allocations" :key="a.id">
                <td>
                  <router-link :to="`/projects/${a.project_id}`" class="text-primary-600 hover:underline">
                    {{ a.project?.name || a.project_id }}
                  </router-link>
                </td>
                <td>{{ a.allocation_percentage }}%</td>
                <td>{{ a.hours_per_week }}h</td>
                <td class="text-xs text-gray-400">{{ formatDate(a.start_date) }} — {{ formatDate(a.end_date) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-gray-400">Belum ada alokasi aktif.</p>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Timesheet Terbaru</h3>
          <table class="data-table" v-if="timesheets.length">
            <thead><tr><th>Tanggal</th><th>Proyek</th><th>Jam</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="t in timesheets" :key="t.id">
                <td>{{ formatDate(t.date) }}</td>
                <td>{{ t.project?.name || t.project_id }}</td>
                <td>{{ t.hours }}h</td>
                <td>
                  <span :class="t.status === 'approved' ? 'badge-success' : t.status === 'rejected' ? 'badge-danger' : 'badge-warning'">
                    {{ t.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-gray-400">Belum ada timesheet di periode ini.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api.js';
import dayjs from 'dayjs';

const route = useRoute();
const loading = ref(true);
const employee = ref(null);
const allocations = ref([]);
const timesheets = ref([]);
const dashboardData = ref(null);

const startDate = ref(dayjs().startOf('month').format('YYYY-MM-DD'));
const endDate = ref(dayjs().endOf('month').format('YYYY-MM-DD'));

const kpis = computed(() => {
  if (!dashboardData.value) return { totalHours: 0, billableHours: 0, utilization: 0, totalCost: 0 };
  const d = dashboardData.value;
  return {
    totalHours: parseFloat(d.totalHours || 0).toFixed(1),
    billableHours: parseFloat(d.billableHours || 0).toFixed(1),
    utilization: parseFloat(d.utilization || 0).toFixed(1),
    totalCost: parseFloat(d.totalCost || 0).toFixed(2),
  };
});

const utilizationColor = computed(() => {
  const u = parseFloat(kpis.value.utilization);
  if (u > 110) return 'text-red-600';
  if (u < 60) return 'text-yellow-600';
  return 'text-green-600';
});

function formatDate(d) {
  return d ? dayjs(d).format('DD MMM YYYY') : '—';
}

async function loadData() {
  loading.value = true;
  try {
    const id = route.params.id;
    const [empRes, allocRes, tsRes, dashRes] = await Promise.all([
      api.get(`/employees/${id}`),
      api.get(`/allocations?employee_id=${id}`),
      api.get(`/timesheets?employee_id=${id}&date_from=${startDate.value}&date_to=${endDate.value}&limit=20`),
      api.get(`/dashboard/employees/${id}?period_start=${startDate.value}&period_end=${endDate.value}`),
    ]);
    employee.value = empRes.data.data;
    allocations.value = allocRes.data.data || [];
    timesheets.value = tsRes.data.data || [];
    dashboardData.value = dashRes.data.data || {};
  } catch (err) {
    console.error('Failed to load employee data', err);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>
