<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">HR Man-Hour Monitor</h1>
        <p class="text-gray-500 mt-2">Sign in to your account</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {{ error }}
        </div>

        <div>
          <label class="form-label">Email Address</label>
          <input
            v-model="email"
            type="email"
            class="form-input"
            placeholder="admin@demo.com"
            required
            autofocus
          />
        </div>

        <div>
          <label class="form-label">Password</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full py-3"
        >
          <span v-if="loading">Signing in...</span>
          <span v-else>Masuk</span>
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Belum punya akun?
          <router-link to="/register" class="text-primary-600 font-semibold hover:underline">Daftar di sini</router-link>
        </p>
      </div>

      <div class="mt-4 p-4 bg-gray-50 rounded-lg">
        <p class="text-xs font-medium text-gray-500 mb-2">Demo Accounts:</p>
        <div class="space-y-1 text-xs text-gray-600">
          <p><strong>Admin:</strong> admin@demo.com / password123</p>
          <p><strong>HR:</strong> hr@demo.com / password123</p>
          <p><strong>PM:</strong> pm@demo.com / password123</p>
          <p><strong>Employee:</strong> john@demo.com / password123</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('admin@demo.com');
const password = ref('password123');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;

  try {
    await authStore.login(email.value, password.value);
    const redirect = route.query.redirect || '/';
    router.push(redirect);
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>
