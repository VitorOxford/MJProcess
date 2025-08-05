<template>
  <v-container fluid class="pa-md-8 pa-2 fill-height">
    <v-card class="glassmorphism-card mx-auto my-auto pa-2 pa-md-4">
      <template v-if="!loading">
        <v-toolbar color="transparent" class="mb-4 header-toolbar">
          <v-toolbar-title class="font-weight-bold header-title">
            <v-icon start>mdi-calendar-check-outline</v-icon>
            Agenda e Filas de Espera
          </v-toolbar-title>
        </v-toolbar>

        <div class="d-flex flex-column flex-md-row ga-4 px-2 mb-4">
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

             <v-card
                class="queue-card"
                variant="tonal"
                color="warning"
                @click="openQueueModal('schedule')"
            >
                <v-card-text class="d-flex align-center">
                     <v-icon size="40" class="mr-4">mdi-clock-alert-outline</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ totalMetersPendingSchedule.toLocaleString('pt-BR') }}m</div>
                        <div class="text-subtitle-1">Aguardando Agendamento</div>
                    </div>
                </v-card-text>
            </v-card>
        </div>


        <div class="kanban-container d-none d-md-flex">
          <div v-for="day in weekDays" :key="day.date.toISOString()" class="kanban-column">
            <div class="column-header-kanban">
              <h4 class="font-weight-bold">{{ day.name }}</h4>
              <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
              <v-progress-linear
                :model-value="(getDayProduction(day.date) / DAILY_LIMIT) * 100"
                :color="getDayProduction(day.date) > DAILY_LIMIT ? 'error' : 'primary'"
                height="6"
                rounded
                class="my-2"
              ></v-progress-linear>
              <v-chip size="small" variant="tonal">{{ getDayProduction(day.date) }}m / {{ DAILY_LIMIT }}m</v-chip>
            </div>
            <div class="kanban-content pa-2">
              <v-card v-for="order in getOrdersForDay(day.date)" :key="order.id" class="order-card-kanban my-2" @click="openDetailModal(order.id)">
                <v-card-text class="pa-2">
                  <div class="d-flex justify-space-between align-center">
                    <p class="font-weight-bold text-body-2 text-truncate">{{ order.customer_name }}</p>
                    <v-chip size="x-small" color="blue" variant="flat">{{ order.quantity_meters }}m</v-chip>
                  </div>
                  <p class="text-caption text-grey-lighten-1 mt-1">{{ order.details.fabric_type }}</p>
                </v-card-text>
              </v-card>
              <p v-if="getOrdersForDay(day.date).length === 0" class="text-caption text-grey text-center mt-4">Nenhum pedido agendado.</p>
            </div>
          </div>
        </div>

        <div class="d-md-none vertical-list-container">
            <div v-for="day in weekDays" :key="`mobile-${day.date.toISOString()}`" class="mb-8">
              <div class="vertical-day-header">
                <h3>{{ day.name }}</h3>
                <span>{{ getShortDate(day.date) }}</span>
              </div>
              <div v-if="getOrdersForDay(day.date).length > 0" class="mt-4">
                <v-card v-for="order in getOrdersForDay(day.date)" :key="`mobile-order-${order.id}`" class="order-card-vertical mb-3" variant="flat" @click="openDetailModal(order.id)">
                  <v-list-item lines="two">
                    <v-list-item-title class="font-weight-bold text-body-1">{{ order.customer_name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ order.details.fabric_type }}</v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="text-right">
                        <v-chip color="primary" variant="tonal" class="mb-1">{{ order.quantity_meters }}m</v-chip>
                      </div>
                    </template>
                  </v-list-item>
                </v-card>
              </div>
              <div v-else class="text-center text-grey-darken-1 pa-6">
                <v-icon>mdi-calendar-check</v-icon>
                <p class="mt-2 text-body-2">Nenhum pedido para este dia.</p>
              </div>
            </div>
          </div>
      </template>

      <v-card-text v-else class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-card-text>
    </v-card>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" @close="showDetailModal = false"/>

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
                    :items="modalOrders"
                    item-value="id"
                    class="bg-transparent"
                    density="compact"
                >
                    <template v-slot:item.customer_name="{ item }">
                        <a @click.prevent="openDetailModal(item.id)" class="font-weight-bold clickable-link">{{ item.customer_name }}</a>
                    </template>
                    <template v-slot:item.quantity_meters="{ item }">
                        {{ item.quantity_meters.toLocaleString('pt-BR') }}m
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
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import { VDataTable } from 'vuetify/components/VDataTable';

type Order = {
  id: string; customer_name: string; status: string; value: number; created_at: string; production_date: string | null; quantity_meters: number;
  details: { fabric_type: string; stamp_details: string; final_art_url?: string; };
  profiles: { full_name: string; } | null; stores: { name: string; } | null;
};

const orders = ref<Order[]>([]);
const loading = ref(true);
const today = new Date();
const DAILY_LIMIT = 10000;

// Estado para o modal de pedido individual
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);

// NOVO ESTADO: Para o modal de filas de espera
const showQueueModal = ref(false);
const modalTitle = ref('');
const modalOrders = ref<Order[]>([]);
const modalHeaders = [
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Tecido', key: 'details.fabric_type' },
    { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Criado em', key: 'created_at' },
];

// --- LÓGICA ATUALIZADA ---
const ordersPendingStock = computed(() => orders.value.filter(o => o.status === 'pending_stock'));
const ordersPendingSchedule = computed(() => orders.value.filter(o => o.status === 'scheduling_pending'));
const totalMetersPendingSchedule = computed(() => ordersPendingSchedule.value.reduce((sum, order) => sum + order.quantity_meters, 0));
const scheduledOrders = computed(() => orders.value.filter(o => o.production_date !== null));

const weekDays = computed(() => {
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Começa na Segunda
  return Array.from({ length: 6 }, (_, i) => ({ // Agora com 6 dias
    date: addDays(start, i),
    name: format(addDays(start, i), 'EEEE', { locale: ptBR })
  }));
});

const fetchAllOrders = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
        .from('orders')
        .select(`id, customer_name, status, value, created_at, production_date, quantity_meters, details, profiles:created_by (full_name), stores (name)`)
        .in('status', ['pending_stock', 'scheduling_pending', 'production_queue', 'in_printing'])
        .order('created_at', { ascending: true });

    if (error) throw error;
    orders.value = data || [];
  } catch (err: any) {
    console.error('Erro ao buscar pedidos:', err);
  } finally {
    loading.value = false;
  }
};

const getOrdersForDay = (date: Date) => {
    return scheduledOrders.value.filter(order => order.production_date && isSameDay(parseISO(order.production_date), date));
};

const getDayProduction = (date: Date) => {
    return getOrdersForDay(date).reduce((sum, order) => sum + order.quantity_meters, 0);
};

// Abre o modal de pedido único
const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};

// NOVA FUNÇÃO: Abre o modal das filas de espera
const openQueueModal = (queueType: 'stock' | 'schedule') => {
    if (queueType === 'stock') {
        modalTitle.value = 'Pedidos Aguardando Matéria-Prima';
        modalOrders.value = ordersPendingStock.value;
    } else {
        modalTitle.value = 'Pedidos Aguardando Agendamento na Produção';
        modalOrders.value = ordersPendingSchedule.value;
    }
    showQueueModal.value = true;
};

const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatDate = (dateString: string) => format(new Date(dateString), "dd/MM/yy 'às' HH:mm", { locale: ptBR });

onMounted(() => {
  fetchAllOrders();
});
</script>

<style scoped lang="scss">
/* ESTILOS BASE E ESTRUTURAIS */
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
.header-toolbar {
  .header-title { font-size: 1.5rem; }
}

/* CARDS DE FILA DE ESPERA (UNIFICADO) */
.queue-card {
    flex: 1;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
    }
}

/* KANBAN (SOMENTE DESKTOP) */
.kanban-container {
  overflow-x: auto;
  flex-grow: 1;
  padding: 8px;
  gap: 16px;
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
  border-left: 3px solid transparent;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  }
}

/* VISÃO VERTICAL (SOMENTE MOBILE) */
.vertical-list-container {
  padding: 16px;
  overflow-y: auto;
  flex-grow: 1;
}
.vertical-day-header {
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  h3 { font-size: 1.25rem; font-weight: 700; }
  span { opacity: 0.8; }
}
.order-card-vertical {
  background-color: rgba(45, 45, 55, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Estilos do Modal de Fila */
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.clickable-link {
    cursor: pointer;
    color: #4dd0e1; // ciano claro
    text-decoration: none;
    &:hover {
        text-decoration: underline;
    }
}

</style>
