<template>
  <div class="hub-container">
    <v-container class="fill-height d-flex justify-center align-center">
      <div class="text-center">
        <v-img src="@/assets/logo.png" max-height="120" contain class="mb-8"></v-img>
        <h1 class="text-h4 font-weight-bold mb-2">Bem-vindo, {{ userStore.profile?.full_name }}!</h1>
        <p class="text-h6 text-medium-emphasis mb-10">Selecione o sistema que deseja acessar.</p>

        <v-row justify="center" align="center">
          <v-col cols="12" sm="6" md="5">
            <v-card class="system-card" @click="goToMjProcess">
              <v-card-text class="pa-6">
                <v-icon size="64" color="primary" class="mb-4">mdi-cogs</v-icon>
                <h2 class="text-h5 font-weight-bold">MJProcess</h2>
                <p class="text-body-1 mt-2">Gestão de Produção e Processos</p>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col v-if="userStore.isAdmin" cols="12" sm="6" md="5">
            <v-card class="system-card" @click="goToFinance" :loading="loadingFinanceToken">
              <v-card-text class="pa-6">
                <v-icon size="64" color="success" class="mb-4">mdi-finance</v-icon>
                <h2 class="text-h5 font-weight-bold">Financeiro</h2>
                <p class="text-body-1 mt-2">Controle Financeiro e Administrativo</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
         <v-alert v-if="errorMessage" type="error" class="mt-8" dense text>
          {{ errorMessage }}
        </v-alert>
      </div>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { supabase } from '@/api/supabase';

const router = useRouter();
const userStore = useUserStore();
const loadingFinanceToken = ref(false);
const errorMessage = ref<string | null>(null);


const goToMjProcess = () => {
  router.push({ name: 'Home' });
};

const goToFinance = async () => {
  loadingFinanceToken.value = true;
  errorMessage.value = null;
  try {
    const { data, error } = await supabase.functions.invoke('generate-finance-token');

    if (error) throw error;

    if (data.token) {
      const financeUrl = `https://mj-financeiro.onrender.com?token=${data.token}`;
      window.open(financeUrl, '_blank');
    } else {
        throw new Error('Token não recebido da função.');
    }

  } catch (error: any) {
    console.error('Erro ao gerar token para o sistema financeiro:', error);
    errorMessage.value = `Não foi possível acessar o sistema financeiro: ${error.message}`;
  } finally {
    loadingFinanceToken.value = false;
  }
};
</script>

<style scoped lang="scss">
.hub-container {
  position: fixed;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  background-color: #121212;
  background-image: radial-gradient(circle at center, rgba(30, 30, 35, 0.8), #121212);
}

.system-card {
  background-color: rgba(35, 35, 40, 0.75) !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px !important;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
    border-color: rgba(var(--v-theme-primary), 0.6);
  }
}
</style>
