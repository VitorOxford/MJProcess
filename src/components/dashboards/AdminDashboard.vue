<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="4">
        <v-row>
          <v-col cols="12">
            <v-card class="kpi-card-dense" color="rgba(30,30,35,0.8)">
              <v-card-text>
                <div class="d-flex align-center">
                  <v-icon size="large" color="green" class="mr-4">mdi-cash-multiple</v-icon>
                  <div>
                    <div class="text-h5 font-weight-bold">R$ {{ totalValueInProduction.toLocaleString('pt-BR') }}</div>
                    <div class="text-subtitle-2 text-grey-lighten-1">Valor em Produção</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
            <v-card class="kpi-card-dense" color="rgba(30,30,35,0.8)">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ ordersInProduction }}</div>
                <div class="text-subtitle-2 text-grey-lighten-1">Pedidos em Produção</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
            <v-card class="kpi-card-dense" color="rgba(30,30,35,0.8)">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ ordersInDesign }}</div>
                <div class="text-subtitle-2 text-grey-lighten-1">Pedidos em Design</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
              <v-card-title>
                <v-icon start>mdi-store-outline</v-icon>
                Desempenho por Loja
              </v-card-title>
              <v-list class="bg-transparent">
                <v-list-item
                  v-for="(stats, storeName) in performanceByStore"
                  :key="storeName"
                >
                  <v-list-item-title class="font-weight-bold">{{ storeName }}</v-list-item-title>
                  <v-list-item-subtitle>{{ stats.orderCount }} pedidos</v-list-item-subtitle>
                  <template v-slot:append>
                    <v-chip color="green" variant="tonal" size="small">R$ {{ stats.totalValue.toLocaleString('pt-BR') }}</v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)" style="height: 100%;">
          <v-card-title class="d-flex align-center">
            Rastreador de Pedidos Ativos
            <v-spacer></v-spacer>
            <v-text-field
                v-model="search"
                density="compact"
                label="Buscar..."
                prepend-inner-icon="mdi-magnify"
                variant="solo-filled"
                flat
                hide-details
                single-line
            ></v-text-field>
          </v-card-title>
          <v-data-table
            v-model:expanded="expanded"
            :headers="headers"
            :items="activeOrders"
            :search="search"
            item-value="id"
            class="bg-transparent"
            show-expand
            density="compact"
          >
            <template v-slot:item.created_at="{ value }">{{ formatDate(value) }}</template>
            <template v-slot:item.value="{ value }">R$ {{ value.toLocaleString('pt-BR') }}</template>
             <template v-slot:item.store_name="{ item }">{{ item.stores?.name || 'N/A' }}</template>
            <template v-slot:item.status="{ value }">
              <v-chip size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] }}</v-chip>
            </template>
            <template v-slot:expanded-row="{ columns, item }">
                <tr>
                    <td :colspan="columns.length" class="pa-4">
                        <OrderTimeline :order-status="item.status" />
                    </td>
                </tr>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import OrderTimeline from '@/components/OrderTimeline.vue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dashboardStore = useDashboardStore();
const {
  totalValueInProduction,
  ordersInProduction,
  ordersInDesign,
} = storeToRefs(dashboardStore);

const search = ref('');
const expanded = ref([]);
const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Loja', key: 'store_name' },
  { title: 'Lançamento', key: 'created_at' },
  { title: 'Valor', key: 'value' },
  { title: 'Status', key: 'status' },
  { title: '', key: 'data-table-expand' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'Aguardando Design', in_design: 'Em Design', changes_requested: 'Em Alteração',
    finalizing: 'Finalizando', customer_approval: 'Aprovação Pendente', production_queue: 'Na Fila',
    in_printing: 'Impressão', in_cutting: 'Corte', completed: 'Finalizado'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', changes_requested: 'red',
    finalizing: 'purple', customer_approval: 'orange', production_queue: 'grey',
    in_printing: 'blue', in_cutting: 'orange', completed: 'green'
};

const activeOrders = computed((): Order[] => {
    return dashboardStore.orders
        .filter(order => order.status !== 'completed')
        .map(order => ({...order, store_name: order.stores?.name || 'N/A' }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

const performanceByStore = computed(() => {
    const storeStats: Record<string, { orderCount: number; totalValue: number }> = {};
    for (const order of dashboardStore.orders) {
        const storeName = order.stores?.name || 'Sem Loja';
        if (!storeStats[storeName]) {
            storeStats[storeName] = { orderCount: 0, totalValue: 0 };
        }
        storeStats[storeName].orderCount++;
        storeStats[storeName].totalValue += order.value || 0;
    }
    return storeStats;
});

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yy', { locale: ptBR });
}
</script>

<style scoped lang="scss">
.kpi-card-dense, .dashboard-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.dashboard-card, .kpi-card-dense {
    height: 100%;
}
:deep(.v-data-table__wrapper) {
    background-color: transparent !important;
}
</style>
