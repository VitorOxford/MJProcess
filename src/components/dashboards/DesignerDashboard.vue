<template>
  <v-container fluid class="designer-dashboard-page">
    <v-row>
      <v-col cols="12" md="4">
        <div class="kpi-grid">
          <div class="aurora-kpi-card">
            <div class="aurora-background"></div>
            <div class="kpi-content">
              <v-icon class="kpi-icon">mdi-clock-outline</v-icon>
              <span class="kpi-value">{{ ordersInQueue }}</span>
              <span class="kpi-label">Projetos na Fila</span>
            </div>
          </div>
          <div class="aurora-kpi-card">
            <div class="aurora-background"></div>
            <div class="kpi-content">
              <v-icon class="kpi-icon">mdi-alert-circle-outline</v-icon>
              <span class="kpi-value">{{ ordersWithChanges }}</span>
              <span class="kpi-label">Alterações Solicitadas</span>
            </div>
          </div>
          <div class="aurora-kpi-card">
             <div class="aurora-background"></div>
             <div class="kpi-content">
                <v-icon class="kpi-icon">mdi-send-check-outline</v-icon>
                <span class="kpi-value">{{ ordersWaitingApproval }}</span>
                <span class="kpi-label">Aguardando Aprovação</span>
             </div>
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="main-dashboard-card" variant="flat">
          <v-card-title class="d-flex align-center pa-5">
            <span class="text-h6 font-weight-bold">Fila de Trabalho</span>
            <v-spacer></v-spacer>
            <v-btn :to="{ name: 'DesignKanban' }" color="primary" variant="flat" prepend-icon="mdi-palette-swatch-outline" size="large">
              Abrir Kanban
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
            <v-data-table
              :headers="headers"
              :items="designOrders"
              class="bg-transparent"
              density="comfortable"
              items-per-page="10"
            >
              <template v-slot:item.created_at="{ value }">{{ formatDate(value) }}</template>
              <template v-slot:item.status="{ value }">
                <v-chip size="small" :color="statusColorMap[value]" label variant="tonal" class="font-weight-bold">{{ statusDisplayMap[value] }}</v-chip>
              </template>
            </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const dashboardStore = useDashboardStore();

const headers = [
  { title: 'Cliente', key: 'customer_name', sortable: true },
  { title: 'Data de Entrada', key: 'created_at', sortable: true },
  { title: 'Status', key: 'status', sortable: true, align: 'end' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'Na Fila', in_design: 'Em Design', changes_requested: 'Alteração',
    finalizing: 'Finalizando', customer_approval: 'Aprovação'
};
const statusColorMap: Record<string, string> = {
    design_pending: '#90a4ae', in_design: '#40c4ff', changes_requested: '#ff5252',
    finalizing: '#e040fb', customer_approval: '#ffab40'
};

const designOrders = computed((): Order[] => {
    const designStatuses = ['design_pending', 'in_design', 'changes_requested', 'finalizing', 'customer_approval'];
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

const handleMouseMove = (e: MouseEvent) => {
  const cards = document.querySelectorAll('.aurora-kpi-card');
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
    (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
  }
};

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
});
</script>

<style scoped lang="scss">
.designer-dashboard-page {
  padding: 2rem;
}

.kpi-grid {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 1.5rem;
  height: 100%;
}

.aurora-kpi-card {
  position: relative;
  border-radius: 16px;
  background-color: rgba(30, 31, 49, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    border-radius: inherit;
    background: radial-gradient(
      800px circle at var(--mouse-x) var(--mouse-y),
      rgba(148, 0, 211, 0.15),
      transparent 40%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
}

.aurora-background {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background:
    radial-gradient(ellipse at 10% 90%, #40c4ff, transparent 50%),
    radial-gradient(ellipse at 90% 10%, #e040fb, transparent 50%);
  filter: blur(60px);
  opacity: 0.3;
  transition: opacity 0.5s ease;
}

.kpi-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #fff;
}

.kpi-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.kpi-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.kpi-label {
  font-size: 0.9rem;
  color: #c0c0c0;
  margin-top: 0.5rem;
  letter-spacing: 0.5px;
}

.main-dashboard-card {
  border-radius: 16px;
  background-color: rgba(30, 31, 49, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.v-data-table) {
  flex-grow: 1;
  background-color: transparent !important;
  .v-data-table-header__cell {
    background-color: rgba(255,255,255,0.05) !important;
    color: #a0a0a0 !important;
  }
  .v-data-table__tr:hover > td {
    background: rgba(255, 255, 255, 0.08) !important;
  }
}
</style>
