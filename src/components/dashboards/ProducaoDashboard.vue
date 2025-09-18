<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(3, 169, 244, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ ordersInProduction }}</div>
            <div class="text-subtitle-2 text-white-50">Pedidos em Produção</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(156, 39, 176, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ totalMetersToPrint.toLocaleString('pt-BR') }}m</div>
            <div class="text-subtitle-2 text-white-50">Metragem na Fila</div>
          </v-card-text>
        </v-card>
      </v-col>
       <v-col cols="12" sm="4">
        <v-card class="kpi-card text-center" color="rgba(76, 175, 80, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ completedToday }}</div>
            <div class="text-subtitle-2 text-white-50">Concluídos Hoje</div>
          </v-card-text>
        </v-card>
      </v-col>

       <v-col cols="12" md="8">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
          <v-card-title class="d-flex align-center">
            Fila de Produção
            <v-spacer></v-spacer>
            <v-btn :to="{ name: 'ProductionKanban' }" color="primary" variant="tonal" prepend-icon="mdi-factory">
              Abrir Kanban
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="productionOrders"
            class="bg-transparent"
            density="compact"
          >
            <template v-slot:item.value="{ value }">R$ {{ value.toLocaleString('pt-BR') }}</template>
            <template v-slot:item.status="{ value }">
              <v-chip size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] }}</v-chip>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
       <v-col cols="12" md="4">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
          <v-card-title>Consumo de Material</v-card-title>
          <v-card-text>
            <div v-for="item in stockConsumption" :key="item.name" class="mb-4">
              <div class="d-flex justify-space-between mb-1">
                <span class="font-weight-bold">{{ item.name }}</span>
                <span class="text-grey">{{ item.meters }}m</span>
              </div>
              <v-progress-linear :model-value="100" :color="item.color" height="8" rounded></v-progress-linear>
            </div>
             <div v-if="stockConsumption.length === 0" class="text-center text-grey">
                Nenhum consumo na fila.
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
import { isToday, parseISO } from 'date-fns';

const dashboardStore = useDashboardStore();

const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Tecido', key: 'details.fabric_type' },
  { title: 'Status', key: 'status' },
];

const statusDisplayMap: Record<string, string> = {
    production_queue: 'Na Fila', in_printing: 'Impressão',
    in_cutting: 'Corte', completed: 'Finalizado'
};
const statusColorMap: Record<string, string> = {
    production_queue: 'grey', in_printing: 'blue',
    in_cutting: 'orange', completed: 'green'
};

const productionOrders = computed((): Order[] => {
    const productionStatuses = ['production_queue', 'in_printing', 'in_cutting'];
    return dashboardStore.orders
        .filter(order => productionStatuses.includes(order.status))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
});

const ordersInProduction = computed(() => productionOrders.value.length);
const totalMetersToPrint = computed(() => productionOrders.value.reduce((sum, order) => sum + order.quantity_meters, 0));
const completedToday = computed(() => dashboardStore.orders.filter(o => o.status === 'completed' && isToday(parseISO(o.updated_at))).length);

const stockConsumption = computed(() => {
    const consumption: Record<string, number> = {};
    productionOrders.value.forEach(order => {
        const fabric = order.details.fabric_type;
        if (fabric) {
            consumption[fabric] = (consumption[fabric] || 0) + order.quantity_meters;
        }
    });

    const colors = ['#00BCD4', '#FFC107', '#4CAF50', '#E91E63', '#3F51B5'];
    return Object.entries(consumption)
        .map(([name, meters], index) => ({
            name,
            meters,
            color: colors[index % colors.length]
        }))
        .sort((a, b) => b.meters - a.meters);
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
