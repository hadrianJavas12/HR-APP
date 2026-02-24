<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

    <!-- Report Selector -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        v-for="report in reportTypes"
        :key="report.key"
        :class="['card cursor-pointer hover:shadow-lg transition-shadow border-2', selectedReport === report.key ? 'border-primary-500' : 'border-transparent']"
        @click="selectedReport = report.key"
      >
        <h3 class="text-lg font-semibold text-gray-800 mb-1">{{ report.title }}</h3>
        <p class="text-sm text-gray-500">{{ report.description }}</p>
      </div>
    </div>

    <!-- Report Parameters -->
    <div class="card mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Parameters</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="form-label">Start Date</label>
          <input v-model="params.start_date" type="date" class="form-input" />
        </div>
        <div>
          <label class="form-label">End Date</label>
          <input v-model="params.end_date" type="date" class="form-input" />
        </div>
        <div v-if="selectedReport === 'project'">
          <label class="form-label">Project</label>
          <select v-model="params.project_id" class="form-input">
            <option value="">All</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div v-if="selectedReport === 'employee'">
          <label class="form-label">Employee</label>
          <select v-model="params.employee_id" class="form-input">
            <option value="">All</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="generateReport" class="btn-primary w-full" :disabled="generating">
            {{ generating ? 'Generating...' : 'Generate Report' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Report Content -->
    <div v-if="reportData" class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">
          {{ reportTypes.find(r => r.key === selectedReport)?.title }}
        </h3>
        <button @click="exportCSV" class="btn-secondary text-sm">Export CSV</button>
      </div>

      <!-- Utilization Report -->
      <template v-if="selectedReport === 'utilization'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Capacity (h)</th>
                <th>Actual (h)</th>
                <th>Utilization %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData" :key="row.employee_id">
                <td class="font-medium">{{ row.employee_name }}</td>
                <td>{{ row.department }}</td>
                <td>{{ row.capacity }}</td>
                <td>{{ parseFloat(row.actual_hours).toFixed(1) }}</td>
                <td>
                  <div class="flex items-center space-x-2">
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                      <div :class="utilBar(row.utilization)" class="h-2 rounded-full" :style="{ width: Math.min(100, row.utilization) + '%' }"></div>
                    </div>
                    <span class="text-sm font-medium">{{ parseFloat(row.utilization).toFixed(1) }}%</span>
                  </div>
                </td>
                <td>
                  <span :class="row.utilization > 110 ? 'badge-danger' : row.utilization < 60 ? 'badge-warning' : 'badge-success'">
                    {{ row.utilization > 110 ? 'Overloaded' : row.utilization < 60 ? 'Underutilized' : 'Optimal' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Project Report -->
      <template v-if="selectedReport === 'project'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Budget (h)</th>
                <th>Actual (h)</th>
                <th>Burn %</th>
                <th>Budget ($)</th>
                <th>Actual Cost ($)</th>
                <th>Variance ($)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData" :key="row.project_id">
                <td class="font-medium">{{ row.project_name }}</td>
                <td>{{ row.budget_hours }}</td>
                <td>{{ parseFloat(row.actual_hours).toFixed(1) }}</td>
                <td>
                  <span :class="row.burn_percent > 90 ? 'text-red-600 font-bold' : ''">
                    {{ parseFloat(row.burn_percent).toFixed(1) }}%
                  </span>
                </td>
                <td>${{ formatMoney(row.budget_amount) }}</td>
                <td>${{ formatMoney(row.actual_cost) }}</td>
                <td :class="parseFloat(row.variance) > 0 ? 'text-red-600' : 'text-green-600'">
                  ${{ formatMoney(row.variance) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Employee Report -->
      <template v-if="selectedReport === 'employee'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Total Hours</th>
                <th>Billable Hours</th>
                <th>Projects</th>
                <th>Avg Hours/Day</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData" :key="row.employee_id">
                <td class="font-medium">{{ row.employee_name }}</td>
                <td>{{ parseFloat(row.total_hours).toFixed(1) }}h</td>
                <td>{{ parseFloat(row.billable_hours).toFixed(1) }}h</td>
                <td>{{ row.project_count }}</td>
                <td>{{ parseFloat(row.avg_hours_per_day).toFixed(1) }}h</td>
                <td>${{ formatMoney(row.total_cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <p v-if="reportData && reportData.length === 0" class="text-center py-8 text-gray-400">
        No data for the selected parameters.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/services/api.js';
import dayjs from 'dayjs';

const selectedReport = ref('utilization');
const generating = ref(false);
const reportData = ref(null);
const projects = ref([]);
const employees = ref([]);

const params = reactive({
  start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
  end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
  project_id: '',
  employee_id: '',
});

const reportTypes = [
  { key: 'utilization', title: 'Utilization Report', description: 'Employee utilization rates across the period.' },
  { key: 'project', title: 'Project Burn Report', description: 'Budget vs actual hours and costs per project.' },
  { key: 'employee', title: 'Employee Productivity', description: 'Hours breakdown per employee with cost analysis.' },
];

function formatMoney(v) { return v ? parseFloat(v).toLocaleString() : '0'; }

function utilBar(u) {
  if (u > 110) return 'bg-red-500';
  if (u < 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

async function generateReport() {
  generating.value = true;
  reportData.value = null;
  try {
    let url;
    const qs = `start_date=${params.start_date}&end_date=${params.end_date}`;
    if (selectedReport.value === 'utilization') {
      url = `/dashboard/utilization?${qs}`;
    } else if (selectedReport.value === 'project') {
      url = `/dashboard/project-burn-rates?${qs}`;
    } else {
      url = `/dashboard/company?${qs}`;
    }
    const res = await api.get(url);
    const data = res.data.data;

    if (selectedReport.value === 'utilization') {
      reportData.value = data.employees || data || [];
    } else if (selectedReport.value === 'project') {
      reportData.value = data.projects || data || [];
    } else {
      reportData.value = data.employees || data || [];
    }
  } catch (err) {
    console.error('Report generation failed', err);
    alert('Failed to generate report');
  } finally {
    generating.value = false;
  }
}

function exportCSV() {
  if (!reportData.value || reportData.value.length === 0) return;
  const headers = Object.keys(reportData.value[0]);
  const csv = [
    headers.join(','),
    ...reportData.value.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${selectedReport.value}_report_${params.start_date}_${params.end_date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadLookups() {
  try {
    const [pRes, eRes] = await Promise.all([
      api.get('/projects?limit=100'),
      api.get('/employees?limit=100'),
    ]);
    projects.value = pRes.data.data || [];
    employees.value = eRes.data.data || [];
  } catch {}
}

onMounted(loadLookups);
</script>
