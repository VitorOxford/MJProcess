<template>
  <v-container fluid class="kanban-page-container">
    <v-card class="glassmorphism-card mx-auto my-auto pa-2 pa-md-4">
      <template v-if="!loading">
        <v-toolbar color="transparent" class="mb-4 header-toolbar">
          <v-toolbar-title class="font-weight-bold header-title d-none d-sm-flex">
            <v-icon start>mdi-calendar-multiselect</v-icon>
            Agenda de Lançamentos
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <div class="d-flex align-center">
            <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
            <div class="week-indicator mx-2 text-center">
              <div class="font-weight-bold">{{ weekRangeText }}</div>
            </div>
            <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
          </div>
        </v-toolbar>

        <div class="d-flex flex-column flex-md-row ga-4 px-2 mb-4">
            <v-card class="queue-card" variant="tonal" color="info" @click="openQueueModal('design')">
                <v-card-text class="d-flex align-center">
                    <v-icon size="40" class="mr-4">mdi-layers-search-outline</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ formatMeters(totalMetersInDesign) }}m</div>
                        <div class="text-subtitle-1">Lançamentos em Aberto</div>
                    </div>
                </v-card-text>
            </v-card>
             <v-card
              class="queue-card"
              :class="{ 'highlight-active': isHighlightingDelayed }"
              variant="tonal"
              color="error"
              @click="toggleDelayedHighlight"
            >
              <v-card-text class="d-flex align-center">
                <v-icon size="40" class="mr-4">mdi-alarm-light-outline</v-icon>
                <div>
                  <div class="text-h6 font-weight-bold">{{ formatMeters(totalMetersDelayed) }}m</div>
                  <div class="text-subtitle-1">{{ delayedGhostItems.length }} Item(s) Atrasado(s)</div>
                </div>
              </v-card-text>
            </v-card>
            <v-card class="queue-card" variant="tonal" color="warning" @click="openQueueModal('stock')">
                <v-card-text class="d-flex align-center">
                    <v-icon size="40" class="mr-4">mdi-package-variant-closed-remove</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ ordersPendingStock.length }} Pedido(s)</div>
                        <div class="text-subtitle-1">Aguardando Matéria-Prima</div>
                    </div>
                </v-card-text>
            </v-card>
        </div>

        <div class="px-2 mb-4">
            <v-text-field
                v-model="searchQuery"
                variant="solo-filled"
                flat
                density="compact"
                label="Buscar por Cliente, Vendedor ou Ref. da Estampa..."
                prepend-inner-icon="mdi-magnify"
                hide-details
                clearable
            ></v-text-field>
        </div>

        <div class="kanban-board-container" :class="{ 'highlight-delayed-mode': isHighlightingDelayed }">
            <div class="kanban-board">
                <div v-for="day in weekDays" :key="day.date.toISOString()" class="kanban-column">
                    <div class="column-header">
                        <h4 class="font-weight-bold">{{ day.name }}</h4>
                        <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
                        <v-chip size="small" variant="tonal" class="mt-2" color="primary">
                            {{ formatMeters(getDayLaunchTotal(day.date)) }}m Lançados
                        </v-chip>
                    </div>
                    <div class="column-content custom-scrollbar">
                        <v-card
                            v-for="item in getItemsForDay(day.date)"
                            :key="item.id"
                            class="order-card my-2"
                            :class="{ 'ghost-card': item.is_ghost, 'delayed-ghost': item.is_delayed }"
                            variant="flat"
                            @click="openDetailModal(item.order_id, item.id)"
                        >
                            <div class="card-border" :style="{'background-color': getMachineTypeForFabric(item.fabric_type) === 'MESA' ? 'var(--v-theme-cyan)' : 'var(--v-theme-amber)'}"></div>
                            <div v-if="item.is_delayed" class="delayed-indicator">ATRASADO</div>
                            <v-card-text class="pa-3">
                                <p class="font-weight-bold text-body-1 text-truncate">{{ item.customer_name }}</p>
                                <p class="text-caption text-medium-emphasis">#{{ String(item.order_number).padStart(4, '0') }} / {{ item.stamp_ref }}</p>
                                <v-divider class="my-2"></v-divider>
                                <div class="d-flex justify-space-between align-center">
                                    <v-chip size="x-small" :color="item.is_ghost ? 'info' : 'success'" label variant="tonal" class="font-weight-bold">
                                        {{ item.is_ghost ? 'Em Design' : 'Em Produção' }}
                                    </v-chip>
                                    <v-chip size="x-small" color="white" variant="flat" class="font-weight-bold">{{ formatMeters(item.quantity_meters) }}m</v-chip>
                                </div>
                            </v-card-text>
                        </v-card>
                        <div v-if="getItemsForDay(day.date).length === 0" class="empty-column-text">
                            Nenhum lançamento.
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </template>

      <v-card-text v-else class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-card-text>
    </v-card>

     <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" :item-id="selectedItemId" @close="closeDetailModal"/>

    <v-dialog v-model="showQueueModal" max-width="900px" persistent>
      <v-card class="glassmorphism-card-dialog">
        <v-toolbar color="transparent">
            <v-toolbar-title class="font-weight-bold">{{ modalTitle }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" @click="showQueueModal = false"></v-btn>
        </v-toolbar>
        <v-card-text>
            <v-data-table
                :headers="modalHeaders"
                :items="modalItems"
                item-value="id"
                class="bg-transparent"
                density="compact"
            >
                <template v-slot:item.customer_name="{ item }">
                    <a @click.prevent="openDetailModal(item.order_id, item.id)" class="font-weight-bold clickable-link">{{ item.customer_name }}</a>
                </template>
                <template v-slot:item.quantity_meters="{ item }">
                    {{ formatMeters(item.quantity_meters) }}m
                </template>
                  <template v-slot:item.creator_name="{ item }">
                    {{ item.creator_name || 'N/A' }}
                </template>
                <template v-slot:item.created_at="{ item }">
                    {{ formatDate(item.created_at) }}
                </template>
            </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrderDetailModal from '@/components/OrderDetailModal.vue';

type KanbanItem = {
  id: string;
  order_id: string;
  order_number: number;
  customer_name: string;
  creator_name: string;
  fabric_type: string;
  stamp_ref: string;
  quantity_meters: number;
  status: string;
  created_at: string;
  scheduled_date?: string;
  production_entry_date?: string;
  is_ghost: boolean;
  is_delayed: boolean;
};

const loading = ref(true);
const allItems = ref<KanbanItem[]>([]);
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));

const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);

const showQueueModal = ref(false);
const modalTitle = ref('');
const modalItems = ref<any[]>([]);
const modalHeaders = [
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Vendedor', key: 'creator_name' },
    { title: 'Ref. Estampa', key: 'stamp_ref' },
    { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Criado em', key: 'created_at' },
];

const searchQuery = ref('');
const isHighlightingDelayed = ref(false);

const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA',
  'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA'
};
const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => fabricMachineMap[fabric] || 'CORRIDA';

const ghostItems = computed(() => allItems.value.filter(item => item.is_ghost));
const delayedGhostItems = computed(() => ghostItems.value.filter(item => item.is_delayed));

const totalMetersDelayed = computed(() => {
    return delayedGhostItems.value.reduce((sum, item) => sum + item.quantity_meters, 0);
});

const toggleDelayedHighlight = () => {
  isHighlightingDelayed.value = !isHighlightingDelayed.value;
};

const filteredItems = computed(() => {
    if (!searchQuery.value) return allItems.value;
    const query = searchQuery.value.toLowerCase();
    return allItems.value.filter(item =>
        item.customer_name.toLowerCase().includes(query) ||
        item.creator_name.toLowerCase().includes(query) ||
        item.stamp_ref.toLowerCase().includes(query)
    );
});

const totalMetersInDesign = computed(() => ghostItems.value.reduce((sum, item) => sum + item.quantity_meters, 0));
const ordersPendingStock = computed(() => {
    const orderIds = new Set(allItems.value.filter(item => item.status === 'pending_stock').map(item => item.order_id));
    return Array.from(orderIds);
});

const weekDays = computed(() => Array.from({ length: 6 }, (_, i) => {
    const date = addDays(currentWeekStart.value, i);
    return { date, name: format(date, 'EEEE', { locale: ptBR }).split('-')[0] };
}));
const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { currentWeekStart.value = subDays(currentWeekStart.value, 7); };
const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatDate = (dateString: string) => format(parseISO(dateString), "dd/MM/yy 'às' HH:mm");
const formatMeters = (meters: number) => Number(meters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

const getItemsForDay = (date: Date): KanbanItem[] => {
    return filteredItems.value.filter(item => {
        const displayDate = item.is_ghost ? parseISO(item.created_at) : (item.production_entry_date ? parseISO(item.production_entry_date) : null);
        return displayDate && isSameDay(displayDate, date);
    });
};

const getDayLaunchTotal = (date: Date) => {
    return getItemsForDay(date).reduce((sum, item) => sum + item.quantity_meters, 0);
}

const openDetailModal = (orderId: string, itemId: string) => {
    selectedOrderId.value = orderId;
    selectedItemId.value = itemId;
    showDetailModal.value = true;
};
const closeDetailModal = () => { showDetailModal.value = false; };

const openQueueModal = (queueType: 'design' | 'stock') => {
    if (queueType === 'design') {
        modalTitle.value = 'Lançamentos em Aberto (Design)';
        modalItems.value = ghostItems.value;
    } else {
        modalTitle.value = 'Pedidos Aguardando Matéria-Prima';
        const ordersMap = new Map();
        allItems.value.forEach(item => {
            if (item.status === 'pending_stock' && !ordersMap.has(item.order_id)) {
                ordersMap.set(item.order_id, item);
            }
        });
        modalItems.value = Array.from(ordersMap.values());
    }
    showQueueModal.value = true;
};

const fetchAllData = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, customer_name, status, created_at,
        creator:created_by(full_name),
        order_items(
          id, status, quantity_meters, fabric_type, stamp_ref, created_at
        ),
        production_schedule(scheduled_date, order_item_id, created_at)
      `);

    if (error) throw error;

    const designStatuses = ['design_pending', 'customer_approval', 'changes_requested', 'approved_by_designer', 'approved_by_seller', 'finalizing'];
    const today = startOfToday();

    const processedItems: KanbanItem[] = [];
    (data || []).forEach(order => {
        order.order_items.forEach(item => {
            const isGhost = designStatuses.includes(item.status);
            const schedule = order.production_schedule.find(s => s.order_item_id === item.id);

            let isDelayed = false;
            if (isGhost) {
                const createdAt = parseISO(item.created_at);
                if (isBefore(createdAt, today)) {
                    isDelayed = true;
                }
            }

            processedItems.push({
                id: item.id,
                order_id: order.id,
                order_number: order.order_number,
                customer_name: order.customer_name,
                creator_name: order.creator?.full_name || 'N/A',
                fabric_type: item.fabric_type,
                stamp_ref: item.stamp_ref,
                quantity_meters: item.quantity_meters,
                status: item.status,
                created_at: item.created_at,
                scheduled_date: schedule?.scheduled_date,
                production_entry_date: schedule?.created_at,
                is_ghost: isGhost,
                is_delayed: isDelayed,
            });
        });
    });

    allItems.value = processedItems;

  } catch (err: any) {
    console.error('Erro ao buscar dados da agenda de lançamentos:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchAllData);
</script>

<style scoped lang="scss">
@keyframes pulse-red-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 83, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 10px 15px rgba(239, 83, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 83, 80, 0);
  }
}

.kanban-page-container {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.glassmorphism-card, .glassmorphism-card-dialog {
  backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.glassmorphism-card {
  height: 100%;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.week-indicator { min-width: 150px; }
.queue-card {
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  &.highlight-active {
      border: 1px solid #ef5350;
      box-shadow: 0 0 15px rgba(239, 83, 80, 0.5);
  }
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  }
}
.kanban-board-container {
  flex-grow: 1;
  overflow: hidden;
  padding-bottom: 8px;
  min-height: 0;
  display: flex;

  &.highlight-delayed-mode .order-card:not(.delayed-ghost) {
    opacity: 0.3;
    filter: grayscale(80%);
  }
}
.kanban-board {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
  height: 100%;
  min-height: 0;
}
.kanban-column {
  display: flex;
  flex-direction: column;
  background-color: rgba(30,30,35,0.7);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 0;
  min-height: 0;
  height: 100%;
}
.column-header {
  text-align: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  text-transform: capitalize;
}
.column-content {
  padding: 8px;
  overflow-y: auto;
  flex: 1 1 0%;
  min-height: 0;
  max-height: unset;
}
.order-card {
  background-color: rgba(45, 45, 55, 0.9);
  cursor: pointer;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.3s ease, filter 0.3s ease;

  &.ghost-card {
    background-color: rgba(40, 50, 60, 0.9);
    border-style: dashed;
  }

  &.delayed-ghost {
    border-color: rgba(239, 83, 80, 0.8);
    .highlight-delayed-mode & {
        animation: pulse-red-glow 2.5s infinite;
    }
  }
}
.delayed-indicator {
    position: absolute;
    top: 6px;
    right: 6px;
    background-color: #E53935;
    color: white;
    font-size: 0.6rem;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    z-index: 2;
}
.card-border {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
}
.empty-column-text {
  font-size: 0.8rem;
  color: #616161;
  text-align: center;
  margin-top: 2rem;
}
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
.clickable-link {
  cursor: pointer;
  color: #4dd0e1;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}
</style>
