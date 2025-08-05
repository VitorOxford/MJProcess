<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(76, 175, 80, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">R$ {{ totalValueSold.toLocaleString('pt-BR') }}</div>
            <div class="text-subtitle-2 text-white-50">Minhas Vendas (Total)</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(255, 152, 0, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ ordersPendingApproval }}</div>
            <div class="text-subtitle-2 text-white-50">Aprovações Pendentes</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(3, 169, 244, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ totalOrdersCreated }}</div>
            <div class="text-subtitle-2 text-white-50">Meus Pedidos Criados</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
          <v-card-title class="d-flex align-center">
            Meus Pedidos Ativos
            <v-spacer></v-spacer>
            <v-btn :to="{ name: 'NewOrder' }" color="primary" variant="tonal" prepend-icon="mdi-plus-box-outline">
              Lançar Pedido
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="myActiveOrders"
            class="bg-transparent"
            density="compact"
          >
            <template v-slot:item.value="{ value }">R$ {{ value.toLocaleString('pt-BR') }}</template>
            <template v-slot:item.status="{ value, item }">
              <v-chip v-if="value !== 'customer_approval'" size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] }}</v-chip>
              <v-btn v-else :to="{ name: 'ApproveOrder', params: { id: item.id } }" color="orange" size="small" variant="tonal">
                Aprovar Arte
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
          <v-card-title>Funil de Pedidos</v-card-title>
          <v-card-text>
            <div v-for="stage in salesFunnel" :key="stage.name" class="mb-4">
              <div class="d-flex justify-space-between mb-1">
                <span class="font-weight-bold">{{ stage.name }}</span>
                <span class="text-grey">{{ stage.count }} pedido(s)</span>
              </div>
              <v-progress-linear :model-value="stage.percentage" :color="stage.color" height="8" rounded></v-progress-linear>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { useUserStore } from '@/stores/user';

const dashboardStore = useDashboardStore();
const userStore = useUserStore();

const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Valor', key: 'value' },
  { title: 'Status', key: 'status', width: '180px' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'No Design', in_design: 'No Design', changes_requested: 'No Design',
    finalizing: 'No Design', customer_approval: 'Aprovação', production_queue: 'Produção',
    in_printing: 'Produção', in_cutting: 'Produção', completed: 'Finalizado'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', changes_requested: 'red',
    finalizing: 'purple', customer_approval: 'orange', production_queue: 'grey',
    in_printing: 'blue', in_cutting: 'orange', completed: 'green'
};

const myOrders = computed((): Order[] => {
    if (!userStore.profile?.id) return [];
    return dashboardStore.orders.filter(o => o.created_by === userStore.profile.id);
});

const myActiveOrders = computed((): Order[] => myOrders.value.filter(order => order.status !== 'completed'));
const ordersPendingApproval = computed(() => myActiveOrders.value.filter(order => order.status === 'customer_approval').length);
const totalValueSold = computed(() => myOrders.value.reduce((sum, order) => sum + (order.value || 0), 0));
const totalOrdersCreated = computed(() => myOrders.value.length);

const salesFunnel = computed(() => {
    const total = myActiveOrders.value.length;
    if (total === 0) return [];
    const designCount = myActiveOrders.value.filter(o => ['design_pending', 'in_design', 'changes_requested', 'finalizing'].includes(o.status)).length;
    const approvalCount = ordersPendingApproval.value;
    const productionCount = myActiveOrders.value.filter(o => ['production_queue', 'in_printing', 'in_cutting'].includes(o.status)).length;

    return [
        { name: 'Em Design', count: designCount, percentage: (designCount / total) * 100, color: 'blue' },
        { name: 'Aguardando Aprovação', count: approvalCount, percentage: (approvalCount / total) * 100, color: 'orange' },
        { name: 'Em Produção', count: productionCount, percentage: (productionCount / total) * 100, color: 'purple' },
    ];
});

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
