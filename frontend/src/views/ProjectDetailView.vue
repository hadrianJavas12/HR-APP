<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/projects" class="text-primary-600 hover:underline mr-3">← Back</router-link>
      <h1 class="text-2xl font-bold text-gray-900">Project Detail</h1>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">Loading...</div>

    <template v-else-if="project">
      <!-- Header -->
      <div class="card mb-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-bold">{{ project.name }}</h2>
            <p class="text-gray-500">{{ project.code }}</p>
            <span :class="statusBadge(project.status)" class="mt-2 inline-block">{{ project.status }}</span>
          </div>
          <div class="text-right space-y-1">
            <p class="text-sm text-gray-400">Anggaran</p>
            <p class="text-xl font-bold text-primary-600">Rp {{ formatMoney(project.planned_cost) }}</p>
            <p class="text-sm text-gray-400">{{ project.planned_hours || '∞' }} jam target</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 mt-3">{{ project.description || 'No description provided.' }}</p>
        <div class="flex space-x-6 mt-3 text-sm text-gray-500">
          <span>Start: {{ formatDate(project.start_date) }}</span>
          <span>End: {{ formatDate(project.end_date) }}</span>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="stat-card">
          <p class="stat-label">Jam Terpakai</p>
          <p class="stat-value">{{ kpis.totalHours }}h</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Pemakaian Budget</p>
          <p class="stat-value" :class="kpis.budgetPercent > 90 ? 'text-red-600' : 'text-green-600'">{{ kpis.budgetPercent }}%</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Biaya Aktual</p>
          <p class="stat-value">Rp {{ kpis.actualCost }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Selisih Biaya</p>
          <p class="stat-value" :class="parseFloat(kpis.costVariance) > 0 ? 'text-red-600' : 'text-green-600'">
            Rp {{ kpis.costVariance }}
          </p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Anggota Tim</p>
          <p class="stat-value">{{ kpis.teamSize }}</p>
        </div>
      </div>

      <!-- Budget Progress Bar -->
      <div class="card mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Budget Burn</h3>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div
            :class="kpis.budgetPercent > 90 ? 'bg-red-500' : kpis.budgetPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'"
            class="h-4 rounded-full transition-all text-center text-xs text-white font-medium leading-4"
            :style="{ width: Math.min(100, kpis.budgetPercent) + '%' }"
          >
            {{ kpis.budgetPercent }}%
          </div>
        </div>
      </div>

      <!-- Team & Timesheets -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Team Allocations</h3>
          <table class="data-table" v-if="allocations.length">
            <thead><tr><th>Employee</th><th>Allocation</th><th>Hours/Week</th><th>Period</th></tr></thead>
            <tbody>
              <tr v-for="a in allocations" :key="a.id">
                <td>
                  <router-link :to="`/employees/${a.employee_id}`" class="text-primary-600 hover:underline">
                    {{ a.employee?.name || a.employee_id }}
                  </router-link>
                </td>
                <td>{{ a.allocation_percentage }}%</td>
                <td>{{ a.hours_per_week }}h</td>
                <td class="text-xs">{{ formatDate(a.start_date) }} — {{ formatDate(a.end_date) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-gray-400">No team allocations.</p>
        </div>

        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Hours by Employee</h3>
          <table class="data-table" v-if="hoursByEmployee.length">
            <thead><tr><th>Employee</th><th>Total Hours</th><th>Approved</th></tr></thead>
            <tbody>
              <tr v-for="h in hoursByEmployee" :key="h.employee_id">
                <td>{{ h.employee_name }}</td>
                <td>{{ parseFloat(h.total_hours).toFixed(1) }}h</td>
                <td>{{ parseFloat(h.approved_hours || 0).toFixed(1) }}h</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-sm text-gray-400">No data.</p>
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
const project = ref(null);
const allocations = ref([]);
const dashboardData = ref(null);

const kpis = computed(() => {
  const d = dashboardData.value || {};
  const budgetHours = project.value?.planned_hours || 0;
  const totalHours = parseFloat(d.totalHours || 0);
  return {
    totalHours: totalHours.toFixed(1),
    budgetPercent: budgetHours > 0 ? ((totalHours / budgetHours) * 100).toFixed(1) : 0,
    actualCost: parseFloat(d.actualCost || 0).toLocaleString(),
    costVariance: parseFloat(d.costVariance || 0).toLocaleString(),
    teamSize: d.teamSize || allocations.value.length,
  };
});

const hoursByEmployee = computed(() => dashboardData.value?.hoursByEmployee || []);

function statusBadge(s) {
  return { active: 'badge-success', planning: 'badge-info', on_hold: 'badge-warning', completed: 'badge-gray', cancelled: 'badge-danger' }[s] || 'badge-gray';
}

function formatDate(d) { return d ? dayjs(d).format('DD MMM YYYY') : '—'; }
function formatMoney(v) { return v ? parseFloat(v).toLocaleString() : '0'; }

async function loadData() {
  loading.value = true;
  const id = route.params.id;
  try {
    const [projRes, allocRes, dashRes] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/allocations?project_id=${id}`),
      api.get(`/dashboard/project/${id}`),
    ]);
    project.value = projRes.data.data;
    allocations.value = allocRes.data.data || [];
    dashboardData.value = dashRes.data.data || {};
  } catch (err) {
    console.error('Failed to load project data', err);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>
