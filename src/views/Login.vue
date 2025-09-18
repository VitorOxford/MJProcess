<template>
  <div class="login-container">
    <div class="app-background-container" :style="{ backgroundImage: `url(${currentBackground})` }"></div>

    <v-container class="fill-height d-flex justify-center align-center pa-4">
      <v-card class="glassmorphism-card login-card" width="100%" max-width="400px">
        <div class="d-flex justify-center pa-6">
            <v-img src="@/assets/logo.png" max-height="100" contain class="animated-logo"></v-img>
        </div>

        <v-card-title class="text-center text-h5 pb-4">
          Acesso Corporativo
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="handleLogin">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              required
              variant="outlined"
            ></v-text-field>
            <v-text-field
              v-model="password"
              label="Senha"
              type="password"
              prepend-inner-icon="mdi-lock-outline"
              required
              variant="outlined"
              class="mt-3"
            ></v-text-field>
            <v-alert
              v-if="errorMessage"
              type="error"
              class="mt-4"
              dense
              text
            >
              {{ errorMessage }}
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn
            :loading="loading"
            @click="handleLogin"
            color="primary"
            block
            size="large"
            variant="flat"
          >
            Entrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from '@/api/supabase';
import { useRouter } from 'vue-router';
import type { AuthError } from '@supabase/supabase-js';

const router = useRouter();
const email = ref<string>('');
const password = ref<string>('');
const loading = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

// --- LÓGICA DO BACKGROUND (sem alterações) ---
const backgrounds = ref([

]);
const currentBackground = ref('');
let backgroundInterval: NodeJS.Timeout;

const startBackgroundCarousel = () => {
    clearInterval(backgroundInterval);
    if (backgrounds.value.length === 0) return;
    currentBackground.value = backgrounds.value[0];
    backgroundInterval = setInterval(() => {
        const currentIndex = backgrounds.value.indexOf(currentBackground.value);
        const nextIndex = (currentIndex + 1) % backgrounds.value.length;
        currentBackground.value = backgrounds.value[nextIndex];
    }, 15000);
};

const handleLogin = async (): Promise<void> => {
  try {
    loading.value = true;
    errorMessage.value = null;
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) throw error;
    router.push('/');
  } catch (error) {
    const authError = error as AuthError;
    errorMessage.value = authError.message || 'Um erro inesperado ocorreu.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  startBackgroundCarousel();
});

onUnmounted(() => {
  clearInterval(backgroundInterval);
});
</script>

<style scoped lang="scss">
.login-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.app-background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background-size: cover;
  background-position: center;
  transition: background-image 1.5s ease-in-out;
  filter: blur(8px);
  -webkit-filter: blur(8px);
  transform: scale(1.1);
}

.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.75) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1;
}

.login-card {
  animation: fadeInDown 0.7s ease-out forwards;
}

.animated-logo {
    animation: fadeIn 1s ease-out forwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* === MUDANÇAS PARA RESPONSIVIDADE === */

/* Adiciona um preenchimento (padding) geral no container em telas pequenas */
.v-container {
  padding: 1rem; /* 16px */
}

/* Garante que o card ocupe a largura total em telas muito pequenas,
   respeitando o padding do container */
.login-card {
  width: 100%;
  max-width: 400px; /* Mantém a largura máxima em telas maiores */
}

/* Ajusta o tamanho do texto do título em telas menores para evitar quebra de linha */
@media (max-width: 600px) {
  .v-card-title {
    font-size: 1.25rem !important; /* Equivalente a text-h6 */
  }
}
</style>
