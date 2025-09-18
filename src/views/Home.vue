<template>
  <div>
    <div class="pa-md-6 pa-4">
        <h1 class="text-h4 font-weight-bold">Bem-vindo, {{ userStore.profile?.full_name || 'Usuário' }}!</h1>
        <p class="text-medium-emphasis">Aqui está um resumo da sua operação hoje.</p>
    </div>

    <div v-if="dashboardStore.loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Carregando dados do dashboard...</p>
    </div>

    <div v-else>
        <AdminDashboard v-if="userStore.isAdmin" />
        <DesignerDashboard v-else-if="userStore.profile?.role === 'designer'" />
        <VendedorDashboard v-else-if="userStore.profile?.role === 'vendedor'" />
        <ProducaoDashboard v-else-if="userStore.profile?.role === 'producao'" />

        <div v-else class="pa-6 text-center">
            <v-icon size="64" class="mb-4 text-grey">mdi-view-dashboard-variant-outline</v-icon>
            <p>Seu dashboard personalizado está em desenvolvimento.</p>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard.vue';
import DesignerDashboard from '@/components/dashboards/DesignerDashboard.vue';
import VendedorDashboard from '@/components/dashboards/VendedorDashboard.vue';
import ProducaoDashboard from '@/components/dashboards/ProducaoDashboard.vue'; // NOVO: Importa o dashboard da produção

const userStore = useUserStore();
const dashboardStore = useDashboardStore();

onMounted(() => {
  dashboardStore.fetchData();
});
</script>
