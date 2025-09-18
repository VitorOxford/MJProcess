<template>
  <v-container fluid class="pa-md-8 pa-2 fill-height">
    <v-card class="glassmorphism-card mx-auto my-auto pa-2 pa-md-4">
      <v-toolbar color="transparent" class="mb-4 header-toolbar">
        <v-toolbar-title class="font-weight-bold header-title d-flex align-center">
          <v-icon start size="32">mdi-rocket-launch-outline</v-icon>
          Kanban de Liberação
        </v-toolbar-title>
      </v-toolbar>

      <div class="d-flex flex-column flex-md-row ga-4 px-2 mb-2">
        <v-card
          class="queue-card"
          variant="tonal"
          color="grey"
          @click="openKpiModal('fila')"
        >
          <v-card-text class="d-flex align-center">
            <v-icon size="40" class="mr-4">mdi-timer-sand</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ kpiData.fila.orders }} Pedido(s)</div>
              <div class="text-subtitle-1">{{ formatMeters(kpiData.fila.meters) }}m na Fila</div>
            </div>
          </v-card-text>
        </v-card>
        <v-card
          class="queue-card kpi-warning"
          variant="tonal"
          color="warning"
          @click="openKpiModal('faturamento')"
        >
          <v-card-text class="d-flex align-center">
            <v-icon size="40" class="mr-4">mdi-file-document-alert-outline</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ kpiData.faturamento.orders }} Pedido(s)</div>
              <div class="text-subtitle-1">{{ formatMeters(kpiData.faturamento.meters) }}m Aguard. Faturamento</div>
            </div>
          </v-card-text>
        </v-card>
        <v-card
          class="queue-card"
          variant="tonal"
          color="success"
          @click="openKpiModal('concluido')"
        >
          <v-card-text class="d-flex align-center">
            <v-icon size="40" class="mr-4">mdi-check-all</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ kpiData.concluido.orders }} Pedido(s)</div>
              <div class="text-subtitle-1">{{ formatMeters(kpiData.concluido.meters) }}m Concluídos</div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <div class="d-flex flex-column flex-sm-row justify-space-between align-center ga-4 px-4 pb-4">
        <div class="d-flex align-center">
          <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
          <div class="week-indicator mx-2 text-center">
            <div class="font-weight-bold">{{ weekRangeText }}</div>
          </div>
          <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
        </div>
        <v-spacer class="d-none d-sm-block"></v-spacer>
        <v-text-field
          v-model="search"
          variant="solo-filled"
          flat
          density="compact"
          label="Buscar por Pedido, Cliente..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          class="w-100"
          style="max-width: 300px;"
          clearable
        ></v-text-field>
      </div>

      <div v-if="loading" class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <div v-else class="kanban-container d-flex">
        <div v-for="day in weekDays" :key="day.date.toISOString()" class="kanban-column">
          <div class="column-header-kanban">
            <h4 class="font-weight-bold">{{ day.name }}</h4>
            <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
            <v-chip size="small" variant="tonal" color="primary" class="mt-2">
              {{ formatMeters(getDayProduction(day.date).total) }}m / {{ formatMeters(getDailyLimit(day.date)) }}m
            </v-chip>
            <div class="limits-breakdown mt-2">
              <div class="limit-row">
                <span class="text-caption">Mesa:</span>
                <span class="text-caption font-weight-medium" :class="{'text-error': getDayProduction(day.date).mesa > dailyLimits.mesa}">
                  {{ formatMeters(getDayProduction(day.date).mesa) }}m
                </span>
              </div>
              <div class="limit-row">
                <span class="text-caption">Corrida:</span>
                <span class="text-caption font-weight-medium" :class="{'text-error': getDayProduction(day.date).corrida > dailyLimits.corrida}">
                  {{ formatMeters(getDayProduction(day.date).corrida) }}m
                </span>
              </div>
            </div>
          </div>
          <div class="kanban-content pa-2">
            <v-card
              v-for="order in day.orders"
              :key="order.id"
              :class="['order-card-kanban my-2', `status--${getOrderStatus(order).key}`]"
              variant="flat"
              @click="openReleaseModal(order)"
            >
              <div class="card-border" :style="{'background-color': getOrderPriorityColor(order.items)}"></div>
              <v-card-text class="pa-3 d-flex flex-column">
                <div>
                  <p class="customer-title text-truncate mb-1">{{ order.customer_name }}</p>
                </div>
                <div class="d-flex justify-space-between align-center mb-1">
                  <p class="text-caption text-medium-emphasis">#{{ String(order.order_number).padStart(4, '0') }}</p>
                  <v-chip size="small" :color="getOrderStatus(order).color" variant="flat" class="font-weight-bold status-chip" label>
                    {{ getOrderStatus(order).text }}
                  </v-chip>
                </div>
                <v-divider class="my-2"></v-divider>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption font-weight-bold text-truncate">{{ order.creator_name }}</span>
                  <v-chip size="small" color="white" variant="flat" class="font-weight-bold meters-chip">
                    {{ formatMeters(getTotalMeters(order.items)) }}m
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
            <p v-if="day.orders.length === 0" class="text-caption text-grey text-center mt-4">Nenhum pedido para este dia.</p>
          </div>
        </div>
      </div>

      <ReleaseOrderModal
        :show="showReleaseModal"
        :order="selectedOrderForRelease"
        @close="closeReleaseModal"
        @update-items="fetchReleasedItems"
      />

      <v-dialog v-model="showKpiModal" max-width="900px" persistent>
        <v-card class="glassmorphism-card-dialog">
          <v-toolbar color="transparent">
            <v-toolbar-title class="font-weight-bold">{{ kpiModalTitle }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" @click="showKpiModal = false"></v-btn>
          </v-toolbar>
          <v-card-text>
            <v-data-table
              :headers="kpiModalHeaders"
              :items="kpiModalItems"
              class="bg-transparent"
              density="compact"
            ></v-data-table>
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { supabase } from '@/api/supabase';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import draggable from 'vuedraggable';
import { useUserStore } from '@/stores/user';
import ReleaseOrderModal from '@/components/production/ReleaseOrderModal.vue';

// --- TYPES ---
type ProductionItem = {
  id: string; order_id: string; order_number: number; customer_name: string;
  creator_name: string; fabric_type: string; stamp_ref: string; quantity_meters: number;
  status: string; scheduled_date: string; stamp_image_url?: string; is_op_generated: boolean;
  production_start_date?: Date;
  billed_at: string | null;
};

type GroupedOrder = {
    id: string; order_number: number; customer_name: string;
    creator_name: string; billed_at: string | null;
    items: ProductionItem[];
};

// --- STATE ---
const userStore = useUserStore();
const loading = ref(true);
const search = ref('');
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));
const allProductionItems = ref<ProductionItem[]>([]);
const transitionName = ref('slide-next');

// Modal State
const showReleaseModal = ref(false);
const selectedOrderForRelease = ref<GroupedOrder | null>(null);
const showKpiModal = ref(false);
const kpiModalTitle = ref('');
const kpiModalItems = ref<any[]>([]);
const kpiModalHeaders = [
    { title: 'Pedido', key: 'order_number' },
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Vendedor', key: 'creator_name' },
    { title: 'Metragem', key: 'total_meters' },
];


// --- CONSTANTS ---
const dailyLimits = { mesa: 4000, corrida: 10000, overall: 14000, saturday: 5000 };
const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA',
  'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA'
};

// --- COMPUTED PROPERTIES ---

const groupedOrders = computed((): GroupedOrder[] => {
    const ordersMap = new Map<string, GroupedOrder>();
    const itemsWithStartDate = allProductionItems.value.map(item => ({
        ...item,
        production_start_date: getProductionStartDate(item.scheduled_date)
    }));

    for (const item of itemsWithStartDate) {
        if (!ordersMap.has(item.order_id)) {
            ordersMap.set(item.order_id, {
                id: item.order_id,
                order_number: item.order_number,
                customer_name: item.customer_name,
                creator_name: item.creator_name,
                billed_at: item.billed_at,
                items: []
            });
        }
        ordersMap.get(item.order_id)!.items.push(item);
    }
    return Array.from(ordersMap.values());
});

const filteredOrders = computed(() => {
    if (!search.value) return groupedOrders.value;
    const query = search.value.toLowerCase();
    return groupedOrders.value.filter(order =>
        order.customer_name.toLowerCase().includes(query) ||
        order.creator_name.toLowerCase().includes(query) ||
        String(order.order_number).includes(query)
    );
});

const kpiData = computed(() => {
    const data = {
        fila: { orders: 0, meters: 0, items: [] as any[] },
        faturamento: { orders: 0, meters: 0, items: [] as any[] },
        concluido: { orders: 0, meters: 0, items: [] as any[] },
    };
    groupedOrders.value.forEach(order => {
        const statusInfo = getOrderStatus(order);
        const totalMeters = getTotalMeters(order.items);
        const orderInfo = {
            order_number: `#${String(order.order_number).padStart(4, '0')}`,
            customer_name: order.customer_name,
            creator_name: order.creator_name,
            total_meters: `${formatMeters(totalMeters)}m`
        };
        if (statusInfo.key === 'fila') {
            data.fila.orders++;
            data.fila.meters += totalMeters;
            data.fila.items.push(orderInfo);
        } else if (statusInfo.key === 'faturamento') {
            data.faturamento.orders++;
            data.faturamento.meters += totalMeters;
            data.faturamento.items.push(orderInfo);
        } else if (statusInfo.key === 'concluido') {
            data.concluido.orders++;
            data.concluido.meters += totalMeters;
            data.concluido.items.push(orderInfo);
        }
    });
    return data;
});

const weekDays = computed(() => {
    return Array.from({ length: 6 }, (_, i) => {
        const date = addDays(currentWeekStart.value, i);
        return { date, name: format(date, 'EEEE', { locale: ptBR }).split('-')[0], orders: getOrdersForDay(date) };
    });
});

// --- METHODS ---

const openKpiModal = (statusKey: 'fila' | 'faturamento' | 'concluido') => {
    kpiModalItems.value = kpiData.value[statusKey].items;
    if (statusKey === 'fila') kpiModalTitle.value = 'Pedidos na Fila';
    if (statusKey === 'faturamento') kpiModalTitle.value = 'Pedidos Aguardando Faturamento';
    if (statusKey === 'concluido') kpiModalTitle.value = 'Pedidos Concluídos e Faturados';
    showKpiModal.value = true;
};

const fetchReleasedItems = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('production_schedule')
      .select(`
        scheduled_date,
        order:orders!inner(id, customer_name, order_number, billed_at, creator:created_by(full_name)),
        item:order_items!inner(id, status, quantity_meters, fabric_type, stamp_ref, stamp_image_url, is_op_generated)
      `)
      .in('item.status', ['production_queue', 'completed']);

    if (error) throw error;

    allProductionItems.value = (data || []).map((entry: any) => ({
      id: entry.item.id,
      order_id: entry.order.id,
      order_number: entry.order.order_number,
      customer_name: entry.order.customer_name,
      creator_name: entry.order.creator?.full_name || 'N/A',
      billed_at: entry.order.billed_at,
      fabric_type: entry.item.fabric_type,
      stamp_ref: entry.item.stamp_ref,
      quantity_meters: entry.item.quantity_meters,
      status: entry.item.status,
      scheduled_date: entry.scheduled_date,
      stamp_image_url: entry.item.stamp_image_url,
      is_op_generated: entry.item.is_op_generated,
    }));
  } catch (err) { console.error('Erro ao buscar itens para liberação:', err); }
  finally { loading.value = false; }
};

const getOrdersForDay = (date: Date): GroupedOrder[] => {
    const orderIdsForDay = new Set<string>();
    filteredOrders.value.forEach(order => {
        const hasItemOnDay = order.items.some(item =>
            item.production_start_date && isSameDay(item.production_start_date, date)
        );
        if (hasItemOnDay) orderIdsForDay.add(order.id);
    });
    return filteredOrders.value.filter(order => orderIdsForDay.has(order.id));
};

const getDayProduction = (date: Date) => {
    const ordersOnDay = getOrdersForDay(date);
    let mesa = 0;
    let corrida = 0;
    ordersOnDay.forEach(order => {
        order.items.forEach(item => {
            if (item.production_start_date && isSameDay(item.production_start_date, date)) {
                if (getMachineTypeForFabric(item.fabric_type) === 'MESA') {
                    mesa += item.quantity_meters;
                } else {
                    corrida += item.quantity_meters;
                }
            }
        });
    });
    return { mesa, corrida, total: mesa + corrida };
};

const getTotalMeters = (items: ProductionItem[]) => items.reduce((sum, item) => sum + item.quantity_meters, 0);

const getOrderPriorityColor = (items: ProductionItem[]) => {
    const allCompleted = items.every(item => item.status === 'completed');
    if (allCompleted) return 'var(--v-theme-success)';
    const hasMesa = items.some(item => getMachineTypeForFabric(item.fabric_type) === 'MESA');
    const hasCorrida = items.some(item => getMachineTypeForFabric(item.fabric_type) === 'CORRIDA');
    if (hasMesa && hasCorrida) return '#FFAB40';
    if (hasMesa) return 'var(--v-theme-cyan)';
    return 'var(--v-theme-amber)';
};

const getOrderStatus = (order: GroupedOrder): { text: string, color: string, key: string } => {
    const allCompleted = order.items.every(item => item.status === 'completed');
    if (allCompleted) {
        return order.billed_at
            ? { text: 'Concluído', color: 'success', key: 'concluido' }
            : { text: 'Aguardando Faturamento', color: 'warning', key: 'faturamento' };
    }
    return { text: 'Na Fila', color: 'grey', key: 'fila' };
};

const openReleaseModal = (order: GroupedOrder) => {
    selectedOrderForRelease.value = order;
    showReleaseModal.value = true;
};
const closeReleaseModal = () => {
    showReleaseModal.value = false;
    selectedOrderForRelease.value = null;
};

const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => fabricMachineMap[fabric] || 'CORRIDA';
const getProductionStartDate = (scheduledDateStr: string): Date => {
    const scheduledDate = parseISO(scheduledDateStr);
    let startDate = addDays(scheduledDate, 1);
    if (getDay(startDate) === 0) startDate = addDays(startDate, 1);
    return startDate;
};
const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const nextWeek = () => { transitionName.value = 'slide-next'; currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { transitionName.value = 'slide-prev'; currentWeekStart.value = subDays(currentWeekStart.value, 7); };
const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatMeters = (meters: number) => Number(meters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const getDailyLimit = (date: Date) => getDay(date) === 6 ? dailyLimits.saturday : dailyLimits.overall;
const isDayOverloaded = (date: Date) => {
    const prod = getDayProduction(date);
    return prod.total > getDailyLimit(date) || prod.mesa > dailyLimits.mesa || prod.corrida > dailyLimits.corrida;
}

onMounted(fetchReleasedItems);
</script>

<style scoped lang="scss">
@keyframes pulse-warning {
  0% { box-shadow: 0 0 0 0 rgba(255, 171, 64, 0.6); }
  70% { box-shadow: 0 0 8px 12px rgba(255, 171, 64, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 171, 64, 0); }
}

.kanban-page-container {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.kpi-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-radius: 12px;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.2);
  }
  &.kpi-warning {
    animation: pulse-warning 2.5s infinite;
  }
}

// Adiciona estilos do Launches.vue para glassmorphism e cards
.glassmorphism-card {
  backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: calc(100vh - 32px);
  max-height: 95vh;
  display: flex;
  flex-direction: column;
}
.header-toolbar .header-title { font-size: 1.5rem; }
.week-indicator { min-width: 150px; }
.queue-card {
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-radius: 12px;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  }
}
.kanban-container {
  overflow-x: auto;
  flex-grow: 1;
  padding: 8px;
  gap: 16px;
  display: flex;
}
.kanban-column {
  flex: 1 1 0px;
  min-width: 280px;
  max-width: 320px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgba(255,255,255,0.05);
}
.column-header-kanban {
  text-align: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}
.kanban-content {
  overflow-y: auto;
  flex-grow: 1;
}
.order-card-kanban {
  background-color: rgba(50, 50, 60, 0.9);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  }
  &.status--fila {
    border-left: 4px solid #616161;
  }
  &.status--concluido {
    border-left: 4px solid #4CAF50;
    background-color: rgba(76, 175, 79, 0.15);
  }
  &.status--faturamento {
    border-left: 4px solid #FFAB40;
    background-color: rgba(255, 171, 64, 0.15);
    animation: pulse-warning 2.5s infinite;
  }
}
.card-title-area {
  flex-grow: 1;
  white-space: normal;
  overflow: hidden;
  margin-right: 8px;
  p { line-height: 1.3; }
}
.status-chip { flex-shrink: 0; }
.meters-chip { background-color: rgba(255, 255, 255, 0.8) !important; color: #1E1E1E !important; }
.card-border { position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
.limits-breakdown {
  width: 100%;
  padding: 4px 8px 0 8px;
  font-size: 0.75rem;
}
.limit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #B0BEC5;
}
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(40, 40, 45, 0.85) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.order-card-kanban .v-card-text {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding-bottom: 0;
}
.order-card-kanban .font-weight-bold.text-body-1 {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.order-card-kanban .status-chip {
  margin-left: 8px;
}
.order-card-kanban .meters-chip {
  margin-left: 8px;
}
.order-card-kanban .text-caption.text-medium-emphasis {
  margin-right: 8px;
}
.customer-title {
  font-size: 1rem;
  font-weight: 600;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  letter-spacing: 0.01em;
}
</style>
