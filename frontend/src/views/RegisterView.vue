<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">HR Man-Hour Monitor</h1>
        <p class="text-gray-500 mt-2">Daftar Akun Baru</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-5">
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {{ error }}
        </div>

        <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {{ success }}
        </div>

        <div>
          <label class="form-label">Nama Lengkap</label>
          <input
            v-model="name"
            type="text"
            class="form-input"
            placeholder="Masukkan nama lengkap"
            required
            autofocus
          />
        </div>

        <div>
          <label class="form-label">Email</label>
          <input
            v-model="email"
            type="email"
            class="form-input"
            placeholder="contoh@email.com"
            required
          />
        </div>

        <div>
          <label class="form-label">Password</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="Minimal 8 karakter"
            required
            minlength="8"
          />
        </div>

        <div>
          <label class="form-label">Konfirmasi Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="form-input"
            placeholder="Ulangi password"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full py-3"
        >
          <span v-if="loading">Mendaftar...</span>
          <span v-else>Daftar</span>
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Sudah punya akun?
          <router-link to="/login" class="text-primary-600 font-semibold hover:underline">Masuk di sini</router-link>
        </p>
      </div>

      <div v-if="registeredUser" class="mt-4 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm font-semibold text-blue-800 mb-1">Akun Berhasil Dibuat!</p>
        <div class="text-xs text-blue-700 space-y-1">
          <p><strong>ID Akun:</strong> {{ registeredUser.id }}</p>
          <p><strong>Nama:</strong> {{ registeredUser.name }}</p>
          <p><strong>Email:</strong> {{ registeredUser.email }}</p>
          <p><strong>Role:</strong> {{ registeredUser.role }}</p>
        </div>
        <p class="text-xs text-blue-600 mt-2">
          ID akun ini akan digunakan untuk menghubungkan dengan data pegawai.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);
const registeredUser = ref(null);

async function handleRegister() {
  error.value = '';
  success.value = '';
  registeredUser.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = 'Password dan konfirmasi password tidak cocok.';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'Password minimal 8 karakter.';
    return;
  }

  loading.value = true;

  try {
    const result = await authStore.register(name.value, email.value, password.value);
    registeredUser.value = result.user;
    success.value = 'Pendaftaran berhasil! Anda akan diarahkan ke dashboard...';

    // Redirect after 2 seconds so user can see their ID
    setTimeout(() => {
      router.push('/');
    }, 2000);
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Pendaftaran gagal. Silakan coba lagi.';
  } finally {
    loading.value = false;
  }
}
</script>
