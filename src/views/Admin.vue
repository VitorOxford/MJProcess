<template>
  <v-container fluid class="pa-md-6 pa-2">
    <v-card class="glassmorphism-card-admin mx-auto">
      <v-toolbar color="transparent" class="px-4">
        <v-toolbar-title class="font-weight-bold text-h5">
          <v-icon start size="32">mdi-shield-crown-outline</v-icon>
          Centro de Comando
        </v-toolbar-title>
      </v-toolbar>

      <v-tabs v-model="tab" color="primary" class="styled-tabs" grow>
        <v-tab value="audit" class="tab-item"><v-icon start>mdi-history</v-icon>Auditoria</v-tab>
        <v-tab value="reports" class="tab-item"><v-icon start>mdi-chart-line</v-icon>Relatórios</v-tab>
        <v-tab value="notifications" class="tab-item"><v-icon start>mdi-bullhorn-outline</v-icon>Notificações</v-tab>
        <v-tab value="stock" class="tab-item"><v-icon start>mdi-warehouse</v-icon>Estoque</v-tab>
        <v-tab value="prices" class="tab-item"><v-icon start>mdi-currency-usd</v-icon>Tabela de Preços</v-tab>
        <v-tab value="users" class="tab-item"><v-icon start>mdi-account-group-outline</v-icon>Usuários</v-tab>
      </v-tabs>

      <v-divider></v-divider>

      <v-window v-model="tab" class="pa-2 pa-md-5">
        <v-window-item value="audit" :eager="true">
          <AdminAuditTab />
        </v-window-item>

        <v-window-item value="reports" :eager="true">
          <AdminReportsTab />
        </v-window-item>

        <v-window-item value="notifications" :eager="true">
          <AdminNotificationsTab />
        </v-window-item>

        <v-window-item value="stock">
          <StockManagement />
        </v-window-item>

        <v-window-item value="prices">
          <AdminPriceListManagement />
        </v-window-item>

        <v-window-item value="users">
          <AdminUserManagement />
        </v-window-item>
      </v-window>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import StockManagement from '@/views/admin/StockManagement.vue';
import AdminAuditTab from '@/components/admin/AdminAuditTab.vue';
import AdminReportsTab from '@/components/admin/AdminReportsTab.vue';
import AdminNotificationsTab from '@/components/admin/AdminNotificationsTab.vue';
import AdminPriceListManagement from '@/components/admin/AdminPriceListManagement.vue';
import AdminUserManagement from '@/components/admin/AdminUserManagement.vue'; // <-- NOVO IMPORT

const tab = ref('audit');
</script>

<style scoped lang="scss">
.glassmorphism-card-admin {
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background-color: rgba(20, 20, 25, 0.75);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.125);
  min-height: 85vh;
}

.styled-tabs {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-item {
  font-weight: 600;
  text-transform: none;
  font-size: 1rem;
}
</style>
