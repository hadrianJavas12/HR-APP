<template>
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside
      class="w-64 bg-gray-900 text-white flex flex-col fixed inset-y-0 left-0 z-30 transition-transform"
      :class="{ '-translate-x-full': !sidebarOpen, 'translate-x-0': sidebarOpen }"
    >
      <div class="h-16 flex items-center px-6 border-b border-gray-800">
        <h1 class="text-lg font-bold tracking-tight">HR Monitor</h1>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="[
            $route.path === item.path || $route.path.startsWith(item.path + '/')
              ? 'bg-primary-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          ]"
        >
          <span class="mr-3 text-lg">{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>

      <div class="p-4 border-t border-gray-800">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold">
            {{ authStore.userName?.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ authStore.userName }}</p>
            <p class="text-xs text-gray-400 truncate">{{ authStore.userRole }}</p>
          </div>
        </div>
        <button @click="handleLogout" class="mt-3 w-full text-left text-sm text-gray-400 hover:text-white transition-colors">
          ← Logout
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 ml-64">
      <!-- Top bar -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
        <button class="lg:hidden" @click="sidebarOpen = !sidebarOpen">
          <span class="text-2xl">☰</span>
        </button>
        <div class="flex-1"></div>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-500">{{ currentDate }}</span>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();
const sidebarOpen = ref(true);

const currentDate = computed(() => new Date().toLocaleDateString('id-ID', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
}));

const navItems = computed(() => {
  const items = [
    { path: '/', label: 'Dashboard', icon: '📊' },
  ];

  // Employees: only HR and Admin
  if (authStore.hasRole('super_admin', 'hr_admin')) {
    items.push({ path: '/employees', label: 'Pegawai', icon: '👥' });
  }

  items.push({ path: '/projects', label: 'Proyek', icon: '📁' });
  items.push({ path: '/timesheets', label: 'Timesheet', icon: '⏱️' });

  // Allocations: PM, HR, and Admin
  if (authStore.hasRole('super_admin', 'hr_admin', 'project_manager')) {
    items.push({ path: '/allocations', label: 'Alokasi', icon: '📋' });
  }

  if (authStore.hasRole('super_admin', 'hr_admin', 'project_manager', 'finance')) {
    items.push({ path: '/reports', label: 'Laporan', icon: '📈' });
  }

  if (authStore.hasRole('super_admin', 'hr_admin')) {
    items.push({ path: '/audit-logs', label: 'Log Audit', icon: '📝' });
  }

  return items;
});

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>
