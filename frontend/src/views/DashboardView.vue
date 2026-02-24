<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

    <!-- Period selector -->
    <div class="flex items-center space-x-4 mb-6">
      <div>
        <label class="form-label">Dari</label>
        <input v-model="periodStart" type="date" class="form-input w-44" @change="loadDashboard" />
      </div>
      <div>
        <label class="form-label">Sampai</label>
        <input v-model="periodEnd" type="date" class="form-input w-44" @change="loadDashboard" />
      </div>
      <button @click="loadDashboard" class="btn-primary mt-5">Muat Ulang</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Memuat dashboard...</p>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- PERSONAL DASHBOARD (Employee / PM / others) -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-if="!loading && isPersonalView && personalData">
      <!-- Personal Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="stat-card">
          <div class="stat-icon bg-purple-100 text-purple-600">⏱️</div>
          <div>
            <p class="stat-value">{{ personalData.utilization.actualHours.toFixed(1) }}h</p>
            <p class="stat-label">Jam Kerja Saya</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-blue-100 text-blue-600">📊</div>
          <div>
            <p class="stat-value">{{ personalData.utilization.capacityHours.toFixed(0) }}h</p>
            <p class="stat-label">Kapasitas Periode</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-green-100 text-green-600">📈</div>
          <div>
            <p class="stat-value">{{ personalData.utilization.utilizationPct }}%</p>
            <p class="stat-label">Utilisasi</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-amber-100 text-amber-600">📋</div>
          <div>
            <p class="stat-value text-yellow-600">{{ personalData.pendingApprovals }}</p>
            <p class="stat-label">Menunggu Persetujuan</p>
          </div>
        </div>
      </div>

      <!-- Utilization Bar -->
      <div class="card mb-8">
        <h2 class="text-lg font-semibold mb-2">Utilisasi Saya</h2>
        <div class="flex items-center space-x-4">
          <div class="flex-1 bg-gray-200 rounded-full h-4">
            <div
              class="h-4 rounded-full transition-all"
              :class="getUtilizationColor(personalData.utilization.utilizationPct)"
              :style="{ width: Math.min(personalData.utilization.utilizationPct, 100) + '%' }"
            ></div>
          </div>
          <span class="text-lg font-bold">{{ personalData.utilization.utilizationPct }}%</span>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Status: <span :class="personalData.utilization.status === 'overloaded' ? 'text-red-600 font-bold' : personalData.utilization.status === 'underutilized' ? 'text-amber-600 font-bold' : 'text-green-600 font-bold'">
            {{ { overloaded: 'Beban Berlebih', normal: 'Normal', underutilized: 'Kurang Dimanfaatkan' }[personalData.utilization.status] || personalData.utilization.status }}
          </span>
        </p>
      </div>

      <!-- Hours by Project -->
      <div class="card mb-6">
        <h2 class="text-lg font-semibold mb-4">📁 Jam per Proyek</h2>
        <div v-if="personalData.hoursByProject.length === 0" class="text-sm text-gray-500">
          Belum ada jam kerja tercatat di periode ini.
        </div>
        <div v-else class="space-y-3">
          <div v-for="proj in personalData.hoursByProject" :key="proj.project_id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p class="font-medium text-sm">{{ proj.name }}</p>
              <p class="text-xs text-gray-400">{{ proj.code }}</p>
            </div>
            <div class="text-right">
              <p class="font-bold text-primary-600">{{ parseFloat(proj.total_hours).toFixed(1) }}h</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Trend -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">📅 Tren Harian</h2>
        <div v-if="personalData.dailyTrend.length === 0" class="text-sm text-gray-500">
          Belum ada data tren harian.
        </div>
        <div v-else class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Total Jam</th>
                <th>Visualisasi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in personalData.dailyTrend" :key="day.date">
                <td class="whitespace-nowrap">{{ formatDate(day.date) }}</td>
                <td class="font-mono">{{ parseFloat(day.total).toFixed(1) }}h</td>
                <td>
                  <div class="w-32 bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full bg-primary-500" :style="{ width: Math.min((parseFloat(day.total) / 10) * 100, 100) + '%' }"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════ -->
    <!-- COMPANY DASHBOARD (Admin / HR)             -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-else-if="!loading && dashboardData">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="stat-card">
          <div class="stat-icon bg-blue-100 text-blue-600">👥</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.totalEmployees }}</p>
            <p class="stat-label">Pegawai Aktif</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-green-100 text-green-600">📁</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.activeProjects }}</p>
            <p class="stat-label">Proyek Aktif</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-purple-100 text-purple-600">⏱️</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.totalActualHours.toFixed(0) }}h</p>
            <p class="stat-label">Total Jam (Periode)</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-amber-100 text-amber-600">📋</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.pendingApprovals }}</p>
            <p class="stat-label">Menunggu Persetujuan</p>
          </div>
        </div>
      </div>

      <!-- Average Utilization -->
      <div class="card mb-8">
        <h2 class="text-lg font-semibold mb-2">Rata-rata Utilisasi</h2>
        <div class="flex items-center space-x-4">
          <div class="flex-1 bg-gray-200 rounded-full h-4">
            <div
              class="h-4 rounded-full transition-all"
              :class="getUtilizationColor(dashboardData.summary.avgUtilization)"
              :style="{ width: Math.min(dashboardData.summary.avgUtilization, 100) + '%' }"
            ></div>
          </div>
          <span class="text-lg font-bold">{{ dashboardData.summary.avgUtilization }}%</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Overloaded Employees -->
        <div class="card">
          <h2 class="text-lg font-semibold mb-4 text-red-600">⚠️ Pegawai Kelebihan Beban</h2>
          <div v-if="dashboardData.alerts.overloadedEmployees.length === 0" class="text-sm text-gray-500">
            Tidak ada pegawai kelebihan beban.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="emp in dashboardData.alerts.overloadedEmployees"
              :key="emp.employeeId"
              class="flex items-center justify-between p-3 bg-red-50 rounded-lg"
            >
              <div>
                <p class="font-medium text-sm">{{ emp.name }}</p>
                <p class="text-xs text-gray-500">{{ emp.department }}</p>
              </div>
              <div class="text-right">
                <span class="badge-danger">{{ emp.utilizationPct }}%</span>
                <p class="text-xs text-gray-500 mt-1">{{ emp.actualHours }}h / {{ emp.capacityHours }}h</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Underutilized Employees -->
        <div class="card">
          <h2 class="text-lg font-semibold mb-4 text-amber-600">📉 Pegawai Kurang Dimanfaatkan</h2>
          <div v-if="dashboardData.alerts.underutilizedEmployees.length === 0" class="text-sm text-gray-500">
            Semua pegawai termanfaatkan dengan baik.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="emp in dashboardData.alerts.underutilizedEmployees"
              :key="emp.employeeId"
              class="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
            >
              <div>
                <p class="font-medium text-sm">{{ emp.name }}</p>
                <p class="text-xs text-gray-500">{{ emp.department }}</p>
              </div>
              <div class="text-right">
                <span class="badge-warning">{{ emp.utilizationPct }}%</span>
                <p class="text-xs text-gray-500 mt-1">{{ emp.actualHours }}h / {{ emp.capacityHours }}h</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Burn Rates -->
      <div class="card mt-6">
        <h2 class="text-lg font-semibold mb-4">🔥 Tingkat Penggunaan Anggaran Proyek</h2>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Proyek</th>
                <th>Status</th>
                <th>Jam Direncanakan</th>
                <th>Jam Aktual</th>
                <th>Burn Rate</th>
                <th>Varians Biaya</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proj in dashboardData.projectBurnRates" :key="proj.projectId">
                <td>
                  <p class="font-medium">{{ proj.name }}</p>
                  <p class="text-xs text-gray-400">{{ proj.code }}</p>
                </td>
                <td><span :class="getStatusBadge(proj.status)">{{ statusLabel(proj.status) }}</span></td>
                <td>{{ proj.plannedHours }}h</td>
                <td>{{ proj.actualHours }}h</td>
                <td>
                  <div class="flex items-center space-x-2">
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        class="h-2 rounded-full"
                        :class="proj.burnRate > 100 ? 'bg-red-500' : 'bg-blue-500'"
                        :style="{ width: Math.min(proj.burnRate, 100) + '%' }"
                      ></div>
                    </div>
                    <span class="text-sm font-medium">{{ proj.burnRate }}%</span>
                  </div>
                </td>
                <td :class="proj.costVariance < 0 ? 'text-red-600' : 'text-green-600'">
                  Rp {{ Math.abs(proj.costVariance).toLocaleString() }}
                  {{ proj.costVariance < 0 ? '(lebih)' : '(hemat)' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboard.js';
import { useAuthStore } from '@/stores/auth.js';
import api from '@/services/api.js';
import dayjs from 'dayjs';

const dashboardStore = useDashboardStore();
const authStore = useAuthStore();
const loading = ref(true);
const dashboardData = ref(null);
const personalData = ref(null);
const myEmployee = ref(null);

// Determine if should show personal or company dashboard
const isPersonalView = computed(() => !authStore.hasRole('super_admin', 'hr_admin'));

// Default: current month
const now = new Date();
const periodStart = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
const periodEnd = ref(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

async function resolveMyEmployee() {
  try {
    const { data } = await api.get('/employees/me');
    myEmployee.value = data.data || null;
  } catch {
    myEmployee.value = null;
  }
}

async function loadDashboard() {
  loading.value = true;
  try {
    if (isPersonalView.value) {
      // Load personal dashboard for employee/PM/finance/viewer
      if (!myEmployee.value) {
        await resolveMyEmployee();
      }
      if (myEmployee.value) {
        personalData.value = await dashboardStore.fetchEmployeeDashboard(
          myEmployee.value.id, periodStart.value, periodEnd.value
        );
      }
    } else {
      // Load company dashboard for admin/HR
      dashboardData.value = await dashboardStore.fetchCompanyDashboard(periodStart.value, periodEnd.value);
    }
  } catch (err) {
    console.error('Gagal memuat dashboard:', err);
  } finally {
    loading.value = false;
  }
}

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—'; }

function getUtilizationColor(pct) {
  if (pct > 110) return 'bg-red-500';
  if (pct > 80) return 'bg-green-500';
  if (pct > 60) return 'bg-blue-500';
  return 'bg-amber-500';
}

function getStatusBadge(status) {
  const map = {
    active: 'badge-success',
    planning: 'badge-info',
    on_hold: 'badge-warning',
    completed: 'badge-gray',
    cancelled: 'badge-danger',
  };
  return map[status] || 'badge-gray';
}

function statusLabel(s) {
  return { active: 'Aktif', planning: 'Perencanaan', on_hold: 'Ditunda', completed: 'Selesai', cancelled: 'Dibatalkan' }[s] || s;
}

onMounted(loadDashboard);
</script>
