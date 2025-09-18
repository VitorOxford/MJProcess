<template>
  <v-container fluid>
    <v-card class="dashboard-container-card">
      <v-card-title class="pa-4">
        <div class="d-flex align-center flex-wrap">
          <div class="d-flex align-center">
            <v-icon color="primary" size="32" class="mr-3">mdi-shield-crown-outline</v-icon>
            <h1 class="text-h5 font-weight-bold">Dashboard Administrador</h1>
          </div>
        </div>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card clickable-kpi alert-card" @click="showApprovalModal = true">
              <div class="shine-effect"></div>
              <v-icon class="kpi-icon">mdi-check-decagram-outline</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ formatNumber(totalMetersPendingApproval) }}m</span>
                <span class="kpi-title">Metros Pend. Aprovação</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card clickable-kpi" @click="openKpiDetailModal('delayed')" style="background: linear-gradient(45deg, #f57c00, #ff9800); color: white;">
              <v-icon class="kpi-icon">mdi-clock-alert-outline</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ itemsDelayedInDesign.count }} ({{ formatNumber(itemsDelayedInDesign.totalMeters) }}m)</span>
                <span class="kpi-title">Itens Atrasados (Design)</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card" style="background: linear-gradient(45deg, #6a1b9a, #9c27b0); color: white;">
              <v-icon class="kpi-icon">mdi-factory</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ formatNumber(totalMetersInProduction) }}m</span>
                <span class="kpi-title">Metragem em Aberto</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card clickable-kpi" @click="openKpiDetailModal('inDesign')" style="background: linear-gradient(45deg, #1e88e5, #42a5f5); color: white;">
              <v-icon class="kpi-icon">mdi-palette-swatch-outline</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ formatNumber(totalMetersInDesign) }}m</span>
                <span class="kpi-title">Metragem em Design</span>
              </div>
            </div>
          </v-col>
           </v-row>
      </v-card-text>

      <v-divider class="my-4"></v-divider>

      <v-card-text class="py-0">
        <v-row align="center" justify="center">
          <v-col cols="12" md="10" lg="8">
            <v-card class="monthly-kpi-card" variant="outlined">
              <div class="d-flex align-center pa-2 pa-sm-4">
                <v-btn icon="mdi-chevron-left" variant="text" @click="dashboardStore.previousMonthKpi"></v-btn>
                <v-spacer></v-spacer>
                <h3 class="text-h6 text-sm-h5 font-weight-bold text-center text-capitalize">{{ monthlyProduction.displayMonth }}</h3>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-chevron-right" variant="text" @click="dashboardStore.nextMonthKpi"></v-btn>
              </div>
              <v-divider></v-divider>
              <v-row no-gutters>
                <v-col cols="6" class="text-center pa-4 pa-sm-6">
                  <div class="text-h5 text-sm-h4 font-weight-black">{{ monthlyProduction.totalOrders }}</div>
                  <div class="text-body-2 text-sm-subtitle-1 text-medium-emphasis">Pedidos no Mês</div>
                </v-col>
                <v-col cols="6" class="text-center pa-4 pa-sm-6 monthly-kpi-divider">
                  <div class="text-h5 text-sm-h4 font-weight-black">{{ formatNumber(monthlyProduction.totalMeters) }}m</div>
                  <div class="text-body-2 text-sm-subtitle-1 text-medium-emphasis">Metragem Total</div>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider class="mt-4"></v-divider>

      <v-tabs v-model="mainTab" color="primary" class="mx-2 mt-2">
        <v-tab value="list"><v-icon start>mdi-format-list-bulleted</v-icon>Lista</v-tab>
        <v-tab value="charts"><v-icon start>mdi-chart-pie</v-icon>Gráficos</v-tab>
      </v-tabs>

      <v-window v-model="mainTab">
        <v-window-item value="list">
          <div class="pa-2">
            <v-tabs v-model="listTab" color="primary" class="mb-2">
              <v-tab value="ready_for_billing">Prontos para Faturamento</v-tab>
              <v-tab value="delivered">Histórico de Entregues</v-tab>
            </v-tabs>
            <v-window v-model="listTab">
              <v-window-item value="ready_for_billing">
                <v-data-table
                  :headers="readyForBillingHeaders"
                  :items="completedOrders"
                  class="bg-transparent"
                  hover
                  height="450"
                  @click:row="(_, { item }) => { selectedOrder = item; showDetailModal = true; }"
                >
                  <template v-slot:item.quantity_meters="{ item }">
                    {{ item.quantity_meters }}m
                  </template>
                  <template v-slot:item.created_at="{ item }">
                    {{ formatDate(item.created_at) }}
                  </template>
                  <template v-slot:item.is_launch="{ item }">
                    <v-chip size="small" :color="item.is_launch ? 'info' : 'default'">{{ item.is_launch ? 'Lançamento' : 'Pedido Único' }}</v-chip>
                  </template>
                  <template v-slot:item.status="{ item }">
                    <v-chip color="success" variant="tonal" size="small">Concluído</v-chip>
                  </template>
                </v-data-table>
              </v-window-item>
              <v-window-item value="delivered">
                <v-data-table
                  :headers="deliveredHeaders"
                  :items="deliveredOrders"
                  class="bg-transparent"
                  hover
                  height="450"
                  @click:row="(_, { item }) => { selectedOrder = item; showDetailModal = true; }"
                >
                  <template v-slot:item.quantity_meters="{ item }">
                    {{ item.quantity_meters }}m
                  </template>
                  <template v-slot:item.delivery_confirmed_at="{ item }">
                    {{ formatDate(item.delivery_confirmed_at) }}
                  </template>
                </v-data-table>
              </v-window-item>
            </v-window>
          </div>
        </v-window-item>

        <v-window-item value="charts">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <ChartCard title="Vendas por Vendedor (Metros)">
                  <Doughnut :data="salesBySellerChartData" :options="chartOptions" @click="openSellerChartModal" />
                </ChartCard>
              </v-col>
              <v-col cols="12" md="4">
                <ChartCard title="Tecidos Mais Vendidos (Metros)">
                  <Doughnut :data="salesByFabricChartData" :options="chartOptions" @click="openFabricChartModal" />
                </ChartCard>
              </v-col>
              <v-col cols="12" md="4">
                <ChartCard title="Itens no Design">
                  <Doughnut :data="designStatusChartData" :options="chartOptions" />
                </ChartCard>
              </v-col>
            </v-row>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrder?.id" @close="showDetailModal = false" />
    <ApprovalWarningModal :show="showApprovalModal" :pending-orders="ordersPendingApproval" @close="showApprovalModal = false" />

    <v-dialog v-model="showKpiDetailModal" max-width="1000px" persistent>
      <v-card class="glassmorphism-card-dialog">
        <v-toolbar color="transparent">
            <v-toolbar-title class="font-weight-bold">{{ modalTitle }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" @click="showKpiDetailModal = false"></v-btn>
        </v-toolbar>
        <v-card-text>
          <v-data-table
            :headers="modalHeaders"
            :items="modalItems"
            class="bg-transparent"
            density="compact"
          >
            <template v-slot:item.quantity_meters="{ value }">
              {{ formatNumber(value) }}m
            </template>
            <template v-slot:item.status="{ item }">
              <v-chip :color="getModalStatus(item).color" size="small" variant="tonal">
                {{ getModalStatus(item).text }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog v-model="showSellerModal" max-width="800px">
      <v-card>
        <v-card-title>Performance por Vendedor</v-card-title>
        <v-card-text>
          <Line :data="sellerLineChartData" :options="lineOptions" />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showFabricModal" max-width="800px">
      <v-card>
        <v-card-title>Tecidos Mais Vendidos</v-card-title>
        <v-card-text>
          <Line :data="fabricLineChartData" :options="lineOptions" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, defineAsyncComponent } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import ApprovalWarningModal from '@/components/admin/ApprovalWarningModal.vue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LineElement, LinearScale, PointElement } from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LineElement, LinearScale, PointElement);

const Doughnut = defineAsyncComponent(() => import('vue-chartjs').then(c => c.Doughnut));
const Line = defineAsyncComponent(() => import('vue-chartjs').then(c => c.Line));
const ChartCard = defineAsyncComponent(() => import('@/components/admin/ChartCard.vue'));

const showDetailModal = ref(false);
const selectedOrder = ref<any | null>(null);
const showApprovalModal = ref(false);
const mainTab = ref('list');
const listTab = ref('ready_for_billing');

const showSellerModal = ref(false);
const showFabricModal = ref(false);

const dashboardStore = useDashboardStore();
const {
  ordersPendingApproval,
  totalMetersPendingApproval,
  itemsDelayedInDesign,
  totalMetersInProduction,
  totalMetersInDesign,
  completedOrders,
  deliveredOrders,
  salesBySeller,
  salesByFabric,
  designItemsStatus,
  monthlyProduction,
  delayedDesignItemsDetails, // <-- NOVO
  allDesignItemsDetails,   // <-- NOVO
} = storeToRefs(dashboardStore);

// ===== INÍCIO DA ALTERAÇÃO =====
const showKpiDetailModal = ref(false);
const modalTitle = ref('');
const modalItems = ref<any[]>([]);
const modalHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Vendedor', key: 'creator_name' },
  { title: 'Item (Ref.)', key: 'stamp_ref' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Status Atual', key: 'status' },
];

const statusDisplayMap: { [key: string]: { text: string; color: string } } = {
  design_pending: { text: 'Na Fila', color: 'blue-grey' },
  customer_approval: { text: 'Com Vendedor', color: 'orange' },
  changes_requested: { text: 'Alteração Solicitada', color: 'error' },
  approved_by_designer: { text: 'Aprovado (Designer)', color: 'cyan' },
  finalizing: { text: 'Finalização', color: 'purple' },
};

const getModalStatus = (item: any) => {
  const statusInfo = statusDisplayMap[item.status];
  if (statusInfo) {
    // Se o status for 'design_pending', usa a 'design_tag' para mais detalhes
    if (item.status === 'design_pending' && item.design_tag) {
      return { text: item.design_tag, color: statusInfo.color };
    }
    return statusInfo;
  }
  return { text: item.status, color: 'grey' }; // Fallback
};

const openKpiDetailModal = (type: 'delayed' | 'inDesign') => {
  if (type === 'delayed') {
    modalTitle.value = 'Itens Atrasados no Design';
    modalItems.value = delayedDesignItemsDetails.value;
  } else if (type === 'inDesign') {
    modalTitle.value = 'Itens Atuais no Design';
    modalItems.value = allDesignItemsDetails.value;
  }
  showKpiDetailModal.value = true;
};
// ===== FIM DA ALTERAÇÃO =====

const formatNumber = (value: number) => {
  return Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

onActivated(async () => {
  await dashboardStore.fetchData();
});

onMounted(async () => {
  await dashboardStore.fetchData();
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: '#fff' }
    }
  }
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { ticks: { color: '#fff' } },
    y: { ticks: { color: '#fff' } }
  },
  plugins: {
    legend: { labels: { color: '#fff' } }
  }
};

const salesBySellerChartData = computed(() => ({
  labels: salesBySeller.value.map(s => s.seller),
  datasets: [{
    backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26A69A', '#FF7043'],
    data: salesBySeller.value.map(s => s.totalMeters)
  }]
}));

const salesByFabricChartData = computed(() => ({
  labels: salesByFabric.value.slice(0, 5).map(f => f.fabric),
  datasets: [{
    backgroundColor: ['#26C6DA', '#7E57C2', '#D4E157', '#FFCA28', '#8D6E63'],
    data: salesByFabric.value.slice(0, 5).map(f => f.totalMeters)
  }]
}));

const designStatusChartData = computed(() => {
  if (!designItemsStatus.value) return { labels: [], datasets: [] };
  return {
    labels: ['Em Dia', 'Atrasado'],
    datasets: [{
      backgroundColor: ['#66BB6A', '#EF5350'],
      data: [designItemsStatus.value.onTime, designItemsStatus.value.delayed]
    }]
  };
});

const sellerLineChartData = computed(() => ({
  labels: salesBySeller.value.map(s => s.seller),
  datasets: [{ label: 'Metros Vendidos', borderColor: '#42A5F5', data: salesBySeller.value.map(s => s.totalMeters) }]
}));

const fabricLineChartData = computed(() => ({
  labels: salesByFabric.value.map(f => f.fabric),
  datasets: [{ label: 'Metros Vendidos', borderColor: '#AB47BC', data: salesByFabric.value.map(f => f.totalMeters) }]
}));

const readyForBillingHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Vendedor', key: 'creator.full_name' },
  { title: 'Tipo', key: 'is_launch' },
  { title: 'Status', key: 'status', align: 'center' },
  { title: 'Metragem', key: 'quantity_meters', align: 'end' },
  { title: 'Data Lançamento', key: 'created_at' },
];

const deliveredHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Vendedor', key: 'creator.full_name' },
  { title: 'Metragem', key: 'quantity_meters', align: 'end' },
  { title: 'Data da Entrega', key: 'delivery_confirmed_at' },
];

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  return format(new Date(dateString), 'dd/MM/yy', { locale: ptBR });
};

const openSellerChartModal = () => { showSellerModal.value = true; };
const openFabricChartModal = () => { showFabricModal.value = true; };
</script>

<style scoped lang="scss">
@keyframes shine {
  0% { transform: translateX(-100%) skewX(-20deg); }
  100% { transform: translateX(200%) skewX(-20deg); }
}
.dashboard-container-card {
  background-color: rgba(25, 25, 30, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}
.kpi-stat-card {
  display: flex; align-items: center; padding: 16px;
  border-radius: 12px;
  transition: all 0.2s ease-in-out; position: relative; overflow: hidden;
  color: white;

  &.clickable-kpi { cursor: pointer; &:hover { transform: translateY(-4px); box-shadow: 0 8px 15px rgba(0,0,0,0.2); } }
  &.alert-card { background: linear-gradient(45deg, #d32f2f, #f44336); color: white; box-shadow: 0 4px 20px rgba(211, 47, 47, 0.4); }
  .shine-effect {
    position: absolute; top: 0; left: 0; width: 50%; height: 100%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%);
    animation: shine 3s infinite;
  }
}
.kpi-icon { font-size: 32px; margin-right: 16px; color: inherit; }
.kpi-content { display: flex; flex-direction: column; color: inherit; }
.kpi-value { font-size: 1.5rem; font-weight: 700; line-height: 1.2; color: inherit;}
.kpi-title { font-size: 0.85rem; color: inherit; opacity: 0.9;}

.monthly-kpi-card {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}
.monthly-kpi-divider {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(40, 40, 45, 0.85) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

:deep(.v-data-table__wrapper tbody tr) {
  cursor: pointer;
  &:hover { background-color: rgba(var(--v-theme-primary-rgb), 0.1) !important; }
}
:deep(.v-data-table .v-data-table-header) {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
