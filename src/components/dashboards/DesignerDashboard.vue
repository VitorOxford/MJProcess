<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(3, 169, 244, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ ordersInQueue }}</div>
            <div class="text-subtitle-2 text-white-50">Projetos na Fila</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(255, 82, 82, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ ordersWithChanges }}</div>
            <div class="text-subtitle-2 text-white-50">Alterações Solicitadas</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(255, 152, 0, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ ordersWaitingApproval }}</div>
            <div class="text-subtitle-2 text-white-50">Aguardando Aprovação</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
          <v-card-title class="d-flex align-center">
            Fila de Trabalho do Design
            <v-spacer></v-spacer>
            <v-btn :to="{ name: 'DesignKanban' }" color="primary" variant="tonal" prepend-icon="mdi-palette-swatch-outline">
              Abrir Kanban
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="designOrders"
            class="bg-transparent"
            density="compact"
          >
             <template v-slot:item.created_at="{ value }">{{ formatDate(value) }}</template>
             <template v-slot:item.status="{ value }">
              <v-chip size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] }}</v-chip>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dashboardStore = useDashboardStore();

const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Data de Entrada', key: 'created_at' },
  { title: 'Status', key: 'status' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'Na Fila', in_design: 'Em Design', changes_requested: 'Em Alteração',
    finalizing: 'Finalizando', customer_approval: 'Aprovação'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', changes_requested: 'red',
    finalizing: 'purple', customer_approval: 'orange'
};

const designOrders = computed((): Order[] => {
    const designStatuses = ['design_pending', 'in_design', 'changes_requested', 'finalizing', 'customer_approval'];
    // Prioriza as alterações solicitadas
    return dashboardStore.orders
        .filter(order => designStatuses.includes(order.status))
        .sort((a, b) => {
            if (a.status === 'changes_requested' && b.status !== 'changes_requested') return -1;
            if (a.status !== 'changes_requested' && b.status === 'changes_requested') return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
});

const ordersInQueue = computed(() => designOrders.value.filter(o => o.status === 'design_pending').length);
const ordersWithChanges = computed(() => designOrders.value.filter(o => o.status === 'changes_requested').length);
const ordersWaitingApproval = computed(() => designOrders.value.filter(o => o.status === 'customer_approval').length);

const formatDate = (dateString: string) => format(new Date(dateString), 'dd/MM/yy HH:mm', { locale: ptBR });
</script>

<style scoped lang="scss">
.kpi-card, .dashboard-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: 100%;
}
.kpi-card {
    border-left-width: 4px;
    border-left-color: currentColor;
}
:deep(.v-data-table__wrapper) {
    background-color: transparent !important;
}
</style>
