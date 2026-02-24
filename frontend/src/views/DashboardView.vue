<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

    <!-- Period selector -->
    <div class="flex items-center space-x-4 mb-6">
      <div>
        <label class="form-label">From</label>
        <input v-model="periodStart" type="date" class="form-input w-44" @change="loadDashboard" />
      </div>
      <div>
        <label class="form-label">To</label>
        <input v-model="periodEnd" type="date" class="form-input w-44" @change="loadDashboard" />
      </div>
      <button @click="loadDashboard" class="btn-primary mt-5">Refresh</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading dashboard...</p>
    </div>

    <template v-else-if="dashboardData">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="stat-card">
          <div class="stat-icon bg-blue-100 text-blue-600">👥</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.totalEmployees }}</p>
            <p class="stat-label">Active Employees</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-green-100 text-green-600">📁</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.activeProjects }}</p>
            <p class="stat-label">Active Projects</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-purple-100 text-purple-600">⏱️</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.totalActualHours.toFixed(0) }}h</p>
            <p class="stat-label">Total Hours (Period)</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-amber-100 text-amber-600">📋</div>
          <div>
            <p class="stat-value">{{ dashboardData.summary.pendingApprovals }}</p>
            <p class="stat-label">Pending Approvals</p>
          </div>
        </div>
      </div>

      <!-- Average Utilization -->
      <div class="card mb-8">
        <h2 class="text-lg font-semibold mb-2">Average Utilization</h2>
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
          <h2 class="text-lg font-semibold mb-4 text-red-600">⚠️ Overloaded Employees</h2>
          <div v-if="dashboardData.alerts.overloadedEmployees.length === 0" class="text-sm text-gray-500">
            No overloaded employees. 🎉
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
          <h2 class="text-lg font-semibold mb-4 text-amber-600">📉 Underutilized Employees</h2>
          <div v-if="dashboardData.alerts.underutilizedEmployees.length === 0" class="text-sm text-gray-500">
            All employees are well-utilized. 👍
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
        <h2 class="text-lg font-semibold mb-4">🔥 Project Burn Rates</h2>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Planned Hours</th>
                <th>Actual Hours</th>
                <th>Burn Rate</th>
                <th>Cost Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proj in dashboardData.projectBurnRates" :key="proj.projectId">
                <td>
                  <p class="font-medium">{{ proj.name }}</p>
                  <p class="text-xs text-gray-400">{{ proj.code }}</p>
                </td>
                <td><span :class="getStatusBadge(proj.status)">{{ proj.status }}</span></td>
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
                  ${{ Math.abs(proj.costVariance).toLocaleString() }}
                  {{ proj.costVariance < 0 ? '(over)' : '(under)' }}
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
import { ref, onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboard.js';

const dashboardStore = useDashboardStore();
const loading = ref(true);
const dashboardData = ref(null);

// Default: current month
const now = new Date();
const periodStart = ref(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
const periodEnd = ref(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

async function loadDashboard() {
  loading.value = true;
  try {
    dashboardData.value = await dashboardStore.fetchCompanyDashboard(periodStart.value, periodEnd.value);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  } finally {
    loading.value = false;
  }
}

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

onMounted(loadDashboard);
</script>
