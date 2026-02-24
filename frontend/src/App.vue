<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.js';

const authStore = useAuthStore();

onMounted(() => {
  // Try to restore session from localStorage
  authStore.restoreSession();
});
</script>
