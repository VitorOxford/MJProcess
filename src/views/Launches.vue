<template>
  <v-container fluid class="pa-md-8 pa-2 fill-height">
    <v-card class="glassmorphism-card mx-auto my-auto pa-2 pa-md-4">
      <template v-if="!loading">
        <v-toolbar color="transparent" class="mb-4 header-toolbar">
          <v-toolbar-title class="font-weight-bold header-title d-none d-sm-flex">
            <v-icon start>mdi-rocket-launch-outline</v-icon>
            Histórico de Lançamentos
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <div class="d-flex align-center">
            <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
            <div class="week-indicator mx-2 text-center">
              <div class="font-weight-bold">{{ weekRangeText }}</div>
              <div class="text-caption text-grey">{{ isCurrentWeek ? 'Semana Atual' : '' }}</div>
            </div>
            <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
          </div>
        </v-toolbar>

        <div class="d-flex flex-column flex-md-row ga-4 px-2 mb-2">
            <v-card
                class="queue-card"
                variant="tonal"
                color="info"
                @click="openQueueModal('design')"
            >
                <v-card-text class="d-flex align-center">
                    <v-icon size="40" class="mr-4">mdi-palette-outline</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ ghostItems.length }} Item(s) em Aberto</div>
                        <div class="text-subtitle-1">{{ totalMetersInDesign.toLocaleString('pt-BR') }}m para finalizar</div>
                    </div>
                </v-card-text>
            </v-card>

            <v-card
                class="queue-card"
                variant="tonal"
                color="error"
                @click="openQueueModal('stock')"
            >
                <v-card-text class="d-flex align-center">
                    <v-icon size="40" class="mr-4">mdi-package-variant-closed-remove</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ ordersPendingStock.length }} Pedido(s)</div>
                        <div class="text-subtitle-1">Aguardando Matéria-Prima</div>
                    </div>
                </v-card-text>
            </v-card>
        </div>

         <div class="d-flex flex-column flex-sm-row justify-space-between align-center ga-4 px-4 pb-4">
             <v-spacer class="d-none d-sm-block"></v-spacer>
             <v-text-field
                v-model="searchQuery"
                variant="solo-filled"
                flat
                density="compact"
                label="Buscar cliente ou vendedor..."
                prepend-inner-icon="mdi-magnify"
                hide-details
                class="w-100"
                style="max-width: 300px;"
            ></v-text-field>
        </div>

        <div class="kanban-container d-none d-md-flex">
          <div v-for="day in weekDays" :key="day.date.toISOString()" class="kanban-column">
            <div class="column-header-kanban">
              <h4 class="font-weight-bold">{{ day.name }}</h4>
              <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
               <v-chip size="small" variant="tonal" color="primary" class="mt-2">{{ getDayTotalMeters(day.date).toLocaleString('pt-BR') }}m Lançados</v-chip>
            </div>
            <div class="kanban-content pa-2">
              <v-card v-for="item in getScheduledItemsForDay(day.date)" :key="item.id" class="order-card-kanban my-2">
                <v-card-text class="pa-2 d-flex flex-column" @click="openDetailModal(item.order_id, item.id)">
                    <p class="font-weight-bold text-body-2 text-truncate">{{ item.order.customer_name }}</p>
                    <p class="text-caption text-grey-lighten-1 mt-1">{{ item.fabric_type }} - {{ item.stamp_ref }}</p>
                    <v-spacer></v-spacer>
                    <div class="d-flex justify-space-between align-center mt-2">
                      <p class="text-caption text-grey">{{ item.order.creator?.full_name || 'N/A' }}</p>
                      <v-chip size="x-small" :color="getMachineTypeForFabric(item.fabric_type) === 'MESA' ? 'cyan' : 'amber'" variant="flat">{{ item.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                    </div>
                </v-card-text>
              </v-card>
              <v-card v-for="ghost in getGhostItemsForDay(day.date)" :key="ghost.id" class="order-card-kanban ghost-card my-2" :class="{'pulsing-delayed': ghost.isDelayed}" @click="openDetailModal(ghost.order_id, ghost.id)">
                <v-card-text class="pa-2 d-flex flex-column">
                    <p class="font-weight-bold text-body-2 text-truncate">{{ ghost.order.customer_name }}</p>
                     <p class="text-caption text-grey-lighten-1 mt-1">{{ ghost.stamp_ref }}</p>
                    <v-spacer></v-spacer>
                    <div class="d-flex justify-space-between align-center mt-2">
                      <p class="text-caption text-grey">{{ ghost.order.creator?.full_name || 'N/A' }}</p>
                       <v-chip size="x-small" color="purple" variant="flat">{{ ghost.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                    </div>
                </v-card-text>
              </v-card>

              <p v-if="getScheduledItemsForDay(day.date).length === 0 && getGhostItemsForDay(day.date).length === 0" class="text-caption text-grey text-center mt-4">Nenhum lançamento para este dia.</p>
            </div>
          </div>
        </div>
      </template>

      <v-card-text v-else class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-card-text>
    </v-card>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" :item-id="selectedItemId" @close="showDetailModal = false"/>

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
                    <a @click.prevent="openDetailModal(item.order_id)" class="font-weight-bold clickable-link">{{ item.customer_name }}</a>
                </template>
                <template v-slot:item.quantity_meters="{ item }">
                    {{ item.quantity_meters.toLocaleString('pt-BR') }}m
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
import { ref, onMounted, computed, onActivated } from 'vue';
import { supabase } from '@/api/supabase';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrderDetailModal from '@/components/OrderDetailModal.vue';

type OrderItem = {
  id: string; fabric_type: string; stamp_ref: string; quantity_meters: number;
  stamp_image_url: string; status: string; is_op_generated: boolean; order_id: string;
};

type Order = {
  id: string; customer_name: string; status: string; created_at: string;
  quantity_meters: number; is_launch: boolean;
  order_number: number;
  details: { fabric_type: string; stamp_details: string; } | null;
  creator?: { full_name: string; };
  order_items: OrderItem[];
};

type ScheduledItem = {
    id: string;
    order_id: string;
    scheduled_date: string;
    quantity_meters: number;
    fabric_type: string;
    stamp_ref: string;
    order: Order;
}

type GhostItem = {
    id: string;
    order_id: string;
    quantity_meters: number;
    stamp_ref: string;
    display_date: Date;
    isDelayed: boolean;
    order: Order;
}

const allOrders = ref<Order[]>([]);
const scheduleEntries = ref<any[]>([]);
const loading = ref(true);
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);
const showQueueModal = ref(false);
const modalTitle = ref('');
const modalItems = ref<any[]>([]);
const searchQuery = ref('');

const modalHeaders = [
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Vendedor', key: 'creator_name' },
    { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Criado em', key: 'created_at' },
];

const ordersPendingStock = computed(() => allOrders.value.filter(o => o.status === 'pending_stock'));
const designAndApprovalStatuses = ['design_pending', 'customer_approval', 'changes_requested', 'approved_by_designer', 'approved_by_seller', 'finalizing'];

const ordersInDesign = computed(() => allOrders.value.filter(o => {
    if (o.is_launch) {
        return o.order_items.some(item => designAndApprovalStatuses.includes(item.status));
    }
    return designAndApprovalStatuses.includes(o.status);
}));

const totalMetersInDesign = computed(() => {
    return ghostItems.value.reduce((sum, item) => sum + item.quantity_meters, 0);
});

const ghostItems = computed((): GhostItem[] => {
    const items: GhostItem[] = [];
    ordersInDesign.value.forEach(order => {
        if(order.is_launch){
            order.order_items.forEach(item => {
                if (designAndApprovalStatuses.includes(item.status)) {
                    const createdAt = parseISO(order.created_at);
                    items.push({
                        id: item.id,
                        order_id: order.id,
                        quantity_meters: item.quantity_meters,
                        stamp_ref: item.stamp_ref,
                        display_date: createdAt,
                        isDelayed: isBefore(createdAt, startOfToday()),
                        order: order
                    })
                }
            })
        }
    });
    return items;
});


const filteredGhostItems = computed(() => {
    if (!searchQuery.value) return ghostItems.value;
    const query = searchQuery.value.toLowerCase();
    return ghostItems.value.filter(ghost =>
        ghost.order.customer_name?.toLowerCase().includes(query) ||
        ghost.order.creator?.full_name?.toLowerCase().includes(query)
    );
});

const scheduledItems = computed((): ScheduledItem[] => {
    return filteredScheduleEntries.value.map((entry: any) => {
        const order = entry.orders;
        const item = order.order_items.find((i: OrderItem) => i.id === entry.order_item_id);
        return {
            id: item?.id || order.id,
            order_id: order.id,
            scheduled_date: entry.scheduled_date,
            quantity_meters: entry.quantity_meters,
            fabric_type: item?.fabric_type || order.details?.fabric_type || 'N/A',
            stamp_ref: item?.stamp_ref || 'Item Único',
            order: order
        };
    });
});

const getScheduledItemsForDay = (date: Date) => {
    return scheduledItems.value.filter(item => {
        const itemDate = new Date(item.order.created_at);
        return isSameDay(itemDate, date);
    });
};

const getDayTotalMeters = (date: Date) => {
    const ghosts = getGhostItemsForDay(date).reduce((sum, item) => sum + item.quantity_meters, 0);
    const solids = getScheduledItemsForDay(date).reduce((sum, item) => sum + item.quantity_meters, 0);
    return ghosts + solids;
};


const filteredScheduleEntries = computed(() => {
    if (!searchQuery.value) return scheduleEntries.value;
    const query = searchQuery.value.toLowerCase();
    return scheduleEntries.value.filter(entry =>
        entry.orders.customer_name?.toLowerCase().includes(query) ||
        entry.orders.creator?.full_name?.toLowerCase().includes(query)
    );
});

const weekDays = computed(() => Array.from({ length: 6 }, (_, i) => ({ date: addDays(currentWeekStart.value, i), name: format(addDays(currentWeekStart.value, i), 'EEEE', { locale: ptBR }) })));
const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const isCurrentWeek = computed(() => isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), currentWeekStart.value));

const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { currentWeekStart.value = subDays(currentWeekStart.value, 7); };

const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = { 'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA', 'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA' };
const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => fabricMachineMap[fabric] || 'CORRIDA';

const getGhostItemsForDay = (date: Date) => {
    return filteredGhostItems.value.filter(ghost => isSameDay(ghost.display_date, date));
};

const openDetailModal = (orderId: string, itemId: string | null = null) => {
    selectedOrderId.value = orderId;
    selectedItemId.value = itemId;
    showDetailModal.value = true;
};

const openQueueModal = (queueType: 'stock' | 'design') => {
    if (queueType === 'stock') {
        modalTitle.value = 'Pedidos Aguardando Matéria-Prima';
        modalItems.value = ordersPendingStock.value.map(o => ({...o, creator_name: o.creator?.full_name}));
    } else {
        modalTitle.value = 'Lançamentos em Aberto (Design)';
        modalItems.value = ghostItems.value.map(g => ({
            id: g.id,
            order_id: g.order_id,
            customer_name: g.order.customer_name,
            creator_name: g.order.creator?.full_name,
            quantity_meters: g.quantity_meters,
            created_at: g.order.created_at,
        }));
    }
    showQueueModal.value = true;
};

const fetchAllData = async () => {
  loading.value = true;
  try {
    const [ordersResponse, scheduleResponse] = await Promise.all([
      supabase
        .from('orders')
        .select(`*, creator:profiles!created_by(full_name), order_items(*)`),
      supabase
        .from('production_schedule')
        .select(`*, orders:order_id (*, creator:profiles!created_by(full_name), order_items(*))`)
        .gte('scheduled_date', format(subDays(new Date(), 90), 'yyyy-MM-dd'))
    ]);

    if (ordersResponse.error) throw ordersResponse.error;
    if (scheduleResponse.error) throw scheduleResponse.error;

    allOrders.value = ordersResponse.data || [];
    scheduleEntries.value = scheduleResponse.data || [];

  } catch (err: any) {
    console.error('Erro ao buscar dados da agenda:', err);
  } finally {
    loading.value = false;
  }
};

const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatDate = (dateString: string) => format(new Date(dateString), "dd/MM/yy 'às' HH:mm", { locale: ptBR });


onActivated(fetchAllData);
onMounted(fetchAllData);
</script>

<style scoped lang="scss">
@keyframes pulse-border {
  0% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 82, 82, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
}

.pulsing-delayed {
  border: 2px solid #EF5350;
  animation: pulse-border 2s infinite;
}
.order-card-kanban .v-card-text { cursor: pointer; display: flex; flex-direction: column; flex-grow: 1; }
.glassmorphism-card { backdrop-filter: blur(15px); background-color: rgba(25, 25, 30, 0.75); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; height: calc(100vh - 32px); max-height: 95vh; display: flex; flex-direction: column; }
.header-toolbar .header-title { font-size: 1.5rem; }
.week-indicator { min-width: 150px; }
.queue-card { flex: 1; cursor: pointer; transition: all 0.2s ease-in-out; &:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); } }
.kanban-container { overflow-x: auto; flex-grow: 1; padding: 8px; gap: 16px; }
.kanban-column { flex: 1 1 0px; min-width: 280px; max-width: 320px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; height: 100%; display: flex; flex-direction: column; background-color: rgba(255,255,255,0.05); }
.column-header-kanban { text-align: center; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); flex-shrink: 0; }
.kanban-content { overflow-y: auto; flex-grow: 1; }
.order-card-kanban { background-color: rgba(50, 50, 60, 0.9); cursor: pointer; display: flex; flex-direction: column; min-height: 120px; &:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important; } }
.ghost-card { opacity: 0.8; border: 2px dashed rgba(255, 255, 255, 0.4); background-color: rgba(80, 80, 90, 0.5); &:hover { opacity: 1; background-color: rgba(80, 80, 90, 0.8); } }
.clickable-link { cursor: pointer; color: #4dd0e1; text-decoration: none; &:hover { text-decoration: underline; } }
.dialog-header, .dialog-footer { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
</style>
