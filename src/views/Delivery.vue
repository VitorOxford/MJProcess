<template>
  <v-container fluid class="delivery-container pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-6">
      <v-toolbar-title class="font-weight-bold text-h5">
        <v-icon start size="x-large" class="mr-2">mdi-truck-delivery-outline</v-icon>
        Agenda de Entregas
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        color="white"
        variant="outlined"
        prepend-icon="mdi-history"
        class="mr-4"
        @click="showHistoryModal = true"
      >
        Ver Histórico
      </v-btn>
      <div class="d-flex align-center">
        <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
        <div class="week-indicator mx-2 text-center" style="min-width: 180px;">
          <div class="font-weight-bold">{{ weekRangeText }}</div>
        </div>
        <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
      </div>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else>
      <div class="delivery-board">
        <div class="delivery-column to-be-scheduled-column">
          <div class="column-header">
            <v-icon class="header-icon">mdi-clipboard-clock-outline</v-icon>
            <div>
              <h3 class="column-title text-h6">Aguardando Envio</h3>
              <p class="text-caption text-grey">{{ toBeScheduledOrders.length }} pedido(s)</p>
            </div>
          </div>
          <draggable
            :list="toBeScheduledOrders"
            :group="{ name: 'orders', pull: 'clone', put: true }"
            item-key="id"
            class="column-content pa-3"
            ghost-class="ghost-card"
            @end="onDragEnd"
            data-status="to-be-scheduled"
            filter=".not-draggable"
          >
            <template #item="{ element: order }">
               <v-card
                class="order-card mb-4"
                elevation="4"
                :data-id="order.id"
                :class="{ 'not-draggable': !canDragOrder(order) }"
              >
                <v-card-text @click="openDetailModal(order.id)">
                  <p class="font-weight-bold text-subtitle-1">{{ order.customer_name }}</p>
                  <v-chip v-if="order.is_launch" size="small" variant="tonal" color="info" class="mt-2">
                    <v-icon start size="x-small">mdi-package-variant-closed</v-icon>
                    Lançamento com {{ order.order_items.length }} itens
                  </v-chip>
                  <p v-else class="info-line"><v-icon size="small">mdi-layers-triple-outline</v-icon> {{ order.details.fabric_type }}</p>
                  <p class="info-line"><v-icon size="small">mdi-ruler-square</v-icon> {{ getOrderDisplayMeters(order) }}m</p>
                </v-card-text>
                <v-card-actions v-if="isReadyForBilling(order) && !order.billed_at" class="justify-center">
                    <v-btn color="success" variant="flat" block @click.stop="openBillingModal(order)">
                        <v-icon start>mdi-cash-register</v-icon>
                        Faturar Pedido
                    </v-btn>
                </v-card-actions>
                <div v-else-if="!isReadyForBilling(order)" class="text-center pa-2 text-caption text-amber">
                    Aguardando todos os itens serem finalizados na produção.
                </div>
                 <div v-else-if="order.billed_at" class="text-center pa-2 text-caption text-success">
                    Pronto para agendar. Arraste para um dia.
                </div>
              </v-card>
            </template>
          </draggable>
        </div>

        <div v-for="day in weekDeliveryDays" :key="day.date.toISOString()" class="delivery-column">
          <div class="column-header">
            <v-icon class="header-icon">mdi-calendar-blank-outline</v-icon>
            <div>
              <h3 class="column-title text-h6">{{ day.name }}</h3>
              <p class="text-caption text-grey">{{ formatDate(day.date, 'dd/MM') }}</p>
            </div>
            <v-chip color="primary" variant="tonal" size="small" class="ml-auto">
              {{ getDayTotalMeters(day.orders) }}m
            </v-chip>
          </div>
          <draggable
            :list="day.orders"
            :group="{ name: 'orders', pull: 'clone', put: true }"
            item-key="id"
            class="column-content pa-3"
            :data-date="day.date.toISOString().split('T')[0]"
            ghost-class="ghost-card"
            @end="onDragEnd"
          >
            <template #item="{ element: order }">
              <v-card
                class="order-card mb-4"
                :class="{ 'confirmed': order.delivery_confirmed_at, 'past-delivery': isPast(day.date) && !isToday(day.date) }"
                elevation="4"
                @click="openDetailModal(order.id)"
                :data-id="order.id"
              >
                <v-icon v-if="order.delivery_confirmed_at" class="confirmed-icon" color="success">mdi-check-circle</v-icon>
                <v-card-text>
                    <p class="font-weight-bold text-subtitle-1">{{ order.customer_name }}</p>
                    <v-chip v-if="order.is_launch" size="small" variant="tonal" color="info" class="mt-2">
                      <v-icon start size="x-small">mdi-package-variant-closed</v-icon>
                      {{ order.order_items.length }} itens
                    </v-chip>
                    <p class="info-line"><v-icon size="small">mdi-ruler-square</v-icon> {{ getOrderDisplayMeters(order) }}m</p>
                </v-card-text>
                <v-fade-transition>
                  <v-card-actions class="actions-overlay" v-if="!order.delivery_confirmed_at">
                    <v-tooltip text="Cancelar Agendamento" location="top">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon="mdi-close" color="red" variant="flat" size="small" @click.stop="rejectDelivery(order)"></v-btn>
                        </template>
                    </v-tooltip>
                    <v-tooltip text="Confirmar Entrega" location="top">
                      <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" icon="mdi-check" color="success" variant="flat" size="small" @click.stop="confirmDelivery(order)"></v-btn>
                      </template>
                    </v-tooltip>
                  </v-card-actions>
                  <v-card-actions class="actions-overlay" v-else-if="userStore.isAdmin && order.delivery_confirmed_at">
                     <v-tooltip text="Reverter Entrega (Admin)" location="top">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon="mdi-undo-variant" color="warning" variant="flat" size="small" @click.stop="rejectDelivery(order)"></v-btn>
                        </template>
                    </v-tooltip>
                  </v-card-actions>
                </v-fade-transition>
              </v-card>
            </template>
            <template #footer>
                <div v-for="ghost in getGhostEntriesForDay(day.date)" :key="ghost.id">
                    <v-card class="order-card ghost-card production-ghost mb-4" elevation="4">
                        <v-card-text @click="openDetailModal(ghost.id)">
                            <p class="font-weight-bold text-subtitle-1">{{ ghost.customer_name }}</p>
                            <v-chip size="small" variant="tonal" color="purple" class="mt-2">
                                <v-icon start size="x-small">mdi-progress-wrench</v-icon>
                                Em Produção
                            </v-chip>
                             <p class="info-line"><v-icon size="small">mdi-information-outline</v-icon> Prev. Conclusão: {{ formatDate(ghost.forecast_completion_date, 'dd/MM') }}</p>
                             <p class="info-line"><v-icon size="small">mdi-ruler-square</v-icon> {{ getOrderDisplayMeters(ghost) }}m</p>
                        </v-card-text>
                         <v-card-actions v-if="userStore.isAdmin" class="justify-center pa-1">
                            <v-btn color="success" variant="text" size="small" @click.stop="openForceCompleteModal(ghost)">
                                <v-icon start>mdi-rocket-launch</v-icon>
                                Forçar Conclusão
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" @close="showDetailModal = false"/>
    <BillingModal :show="showBillingModal" :order="selectedOrderForBilling" @close="showBillingModal = false" @billed="handleBilled" />

    <v-dialog v-model="showHistoryModal" max-width="1200px" persistent>
        <v-card class="glassmorphism-card-dialog">
            <v-toolbar color="transparent">
                <v-toolbar-title class="font-weight-bold">Histórico de Entregas</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-close" @click="showHistoryModal = false"></v-btn>
            </v-toolbar>
            <v-card-text>
                <v-row class="mb-4">
                    <v-col cols="12" md="8">
                        <v-text-field
                            v-model="historySearch"
                            label="Buscar por cliente ou vendedor..."
                            variant="outlined"
                            density="compact"
                            hide-details
                            clearable
                        ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="4">
                         <v-autocomplete
                            v-model="selectedFabrics"
                            :items="fabricTypesForFilter"
                            label="Filtrar por tecido"
                            variant="outlined"
                            density="compact"
                            multiple
                            chips
                            closable-chips
                            hide-details
                            clearable
                        ></v-autocomplete>
                    </v-col>
                </v-row>
                <v-data-table
                    :headers="historyHeaders"
                    :items="filteredDeliveredOrders"
                    class="bg-transparent"
                    item-value="id"
                    hover
                    @click:row="(_, { item }) => openDetailModal(item.id)"
                >
                    <template v-slot:item.actual_delivery_date="{ item }">
                        <span>{{ formatDate(item.actual_delivery_date, 'dd/MM/yyyy') }}</span>
                    </template>
                    <template v-slot:item.customer_name="{ item }">
                        <span class="font-weight-bold">{{ item.customer_name }}</span>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="showForceCompleteModal" max-width="500px" persistent>
        <v-card class="glassmorphism-card-dialog">
            <v-card-title class="dialog-header">
                <span class="text-h5">Forçar Conclusão?</span>
            </v-card-title>
            <v-card-text class="py-4">
                <p>
                    Tem certeza que deseja forçar a conclusão do pedido de <strong>{{ selectedOrderForForceComplete?.customer_name }}</strong>?
                </p>
                <p class="mt-2 text-medium-emphasis">
                    Esta ação irá mover <strong>todos os itens</strong> deste pedido diretamente para o status 'Concluído' e o tornará um card sólido, pronto para agendamento.
                </p>
            </v-card-text>
            <v-card-actions class="dialog-footer">
                <v-spacer></v-spacer>
                <v-btn text @click="closeForceCompleteModal">Cancelar</v-btn>
                <v-btn color="success" variant="flat" @click="confirmForceComplete" :loading="isForcingComplete">
                    Confirmar
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import BillingModal from '@/components/BillingModal.vue';
import draggable from 'vuedraggable';
import { useUserStore } from '@/stores/user';
import { format, addDays, startOfToday, getDay, isSameDay, parseISO, isBefore, startOfWeek, endOfWeek, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
type OrderItem = { id: string; status: string; fabric_type: string; quantity_meters: number; billed_quantity: number | null; };
type Order = {
  id: string; customer_name: string; quantity_meters: number; status: string;
  is_launch: boolean; details: { fabric_type: string; };
  actual_delivery_date: Date | null; delivery_confirmed_at: string | null;
  production_date: string | null;
  billed_at: string | null;
  order_number: number;
  order_items: OrderItem[];
  creator: { full_name: string; } | null;
};

// State
const userStore = useUserStore();
const loading = ref(true);
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const allOrders = ref<Order[]>([]);
const currentDeliveryWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));

const showHistoryModal = ref(false);
const historySearch = ref('');
const selectedFabrics = ref<string[]>([]);
const showBillingModal = ref(false);
const selectedOrderForBilling = ref<Order | null>(null);

const showForceCompleteModal = ref(false);
const isForcingComplete = ref(false);
const selectedOrderForForceComplete = ref<Order | null>(null);

const historyHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Data da Entrega', key: 'actual_delivery_date' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Vendedor', key: 'creator.full_name' },
];

const toBeScheduledOrders = computed(() => allOrders.value.filter(o => o.status === 'completed' && !o.actual_delivery_date));
const scheduledOrders = computed(() => allOrders.value.filter(o => !!o.actual_delivery_date));
const deliveredOrders = computed(() => {
    return scheduledOrders.value.filter(o => o.delivery_confirmed_at)
        .sort((a,b) => (b.actual_delivery_date?.getTime() || 0) - (a.actual_delivery_date?.getTime() || 0));
});
const inProductionOrders = computed(() => {
    return allOrders.value.filter(o =>
        ['production_queue', 'in_printing', 'in_cutting'].includes(o.status) && o.production_date
    );
});

const isReadyForBilling = (order: Order) => {
    if (!order.is_launch) return true;
    return order.order_items.every(item => item.status === 'completed');
};

const canDragOrder = (order: Order) => {
    return !!order.billed_at;
};

const getOrderDisplayMeters = (order: Order) => {
    if (order.billed_at && order.is_launch && order.order_items.length > 0) {
        return order.order_items.reduce((sum, item) => sum + (item.billed_quantity || item.quantity_meters || 0), 0);
    }
    return order.quantity_meters;
};


// Adiciona dias úteis (não conta domingos)
const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) {
      addedDays++;
    }
  }
  return newDate;
};

// Encontra o próximo dia de entrega válido (terça, quinta, sábado)
const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        const dayOfWeek = newDate.getDay();
        if ([2, 4, 6].includes(dayOfWeek)) {
            return newDate;
        }
        newDate.setDate(newDate.getDate() + 1);
    }
};

const productionGhosts = computed(() => {
    return inProductionOrders.value.map(order => {
        const productionStartDate = parseISO(order.production_date!);
        const completionDate = addBusinessDays(productionStartDate, 3);
        const forecastDeliveryDate = getNextDeliveryDay(completionDate);

        // ** CORREÇÃO DA LÓGICA **
        // A lógica de recalcular a data foi removida.
        // A função daily-status-update no backend é responsável por mudar o status para 'completed'.
        // O frontend simplesmente exibirá a data de entrega prevista original.
        // Se o pedido estiver atrasado (data de conclusão passou), ele ainda aparecerá como fantasma
        // na data prevista, até que o status seja atualizado para 'completed' e ele vire um card sólido.

        return {
            ...order,
            forecast_completion_date: completionDate,
            forecast_delivery_date: forecastDeliveryDate,
        };
    });
});

const getGhostEntriesForDay = (date: Date) => {
    return productionGhosts.value.filter(ghost =>
        ghost.forecast_delivery_date && isSameDay(ghost.forecast_delivery_date, date)
    );
};

const getDayTotalMeters = (orders: Order[]) => {
    const total = orders.reduce((sum, order) => sum + getOrderDisplayMeters(order), 0);
    return total.toLocaleString('pt-BR');
};


const weekDeliveryDays = computed(() => {
    const weekStart = currentDeliveryWeekStart.value;
    const days = [ { name: 'Terça-feira', dayOfWeek: 2 }, { name: 'Quinta-feira', dayOfWeek: 4 }, { name: 'Sábado', dayOfWeek: 6 }, ];
    return days.map(dayInfo => {
        let currentDate = new Date(weekStart);
        while (getDay(currentDate) !== dayInfo.dayOfWeek) {
            currentDate = addDays(currentDate, 1);
        }
        return {
            name: dayInfo.name, date: currentDate,
            orders: scheduledOrders.value.filter(o => o.actual_delivery_date && isSameDay(o.actual_delivery_date, currentDate))
        };
    });
});


const isPast = (date: Date): boolean => isBefore(date, startOfToday());
const weekRangeText = computed(() => `${format(currentDeliveryWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentDeliveryWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const nextWeek = () => currentDeliveryWeekStart.value = addDays(currentDeliveryWeekStart.value, 7);
const previousWeek = () => currentDeliveryWeekStart.value = subDays(currentDeliveryWeekStart.value, 7);

const onDragEnd = async (event: any) => {
    const { item, to } = event;
    const orderId = item.dataset.id;
    const newDateStr = to.dataset.date;
    if (!orderId) return;

    const order = allOrders.value.find(o => o.id === orderId);
    if (order) {
      order.actual_delivery_date = newDateStr ? parseISO(newDateStr) : null;
    }

    try {
        const { error } = await supabase
            .from('orders')
            .update({ actual_delivery_date: newDateStr || null })
            .eq('id', orderId);

        if (error) {
          console.error('Erro ao reagendar entrega:', error.message);
          await fetchDeliveryOrders();
        }
    } catch (err: any) {
        console.error('Erro crítico ao reagendar entrega:', err.message);
        await fetchDeliveryOrders();
    }
};

const confirmDelivery = async (order: Order) => {
  try {
    const { error } = await supabase
        .from('orders')
        .update({ delivery_confirmed_at: new Date().toISOString(), status: 'delivered' })
        .eq('id', order.id);
    if (error) throw error;
    await fetchDeliveryOrders();
  } catch (err: any) {
    console.error('Erro ao confirmar entrega:', err.message);
  }
};

const rejectDelivery = async (order: Order) => {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ delivery_confirmed_at: null, actual_delivery_date: null, status: 'completed' })
            .eq('id', order.id);
        if (error) throw error;
        await fetchDeliveryOrders();
    } catch (err: any) {
        console.error('Erro ao cancelar entrega:', err.message);
  }
};

const openDetailModal = (orderId: string) => {
  selectedOrderId.value = orderId;
  showDetailModal.value = true;
};

const openBillingModal = (order: Order) => {
    selectedOrderForBilling.value = order;
    showBillingModal.value = true;
};

const handleBilled = async () => {
    showBillingModal.value = false;
    await fetchDeliveryOrders();
};


const formatDate = (date: Date | string | null | undefined, formatString: string) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(dateObj, formatString, { locale: ptBR });
};

const fetchDeliveryOrders = async () => {
  loading.value = true;
  try {
    const relevantStatuses = ['completed', 'delivered', 'in_printing', 'in_cutting', 'production_queue'];

    const { data: scheduledData, error: scheduledError } = await supabase
      .from('production_schedule')
      .select(`
        scheduled_date,
        order:orders!inner(
          id, customer_name, quantity_meters, status, is_launch, details, billed_at, order_number,
          creator:created_by(full_name),
          actual_delivery_date, delivery_confirmed_at,
          order_items(id, status, fabric_type, quantity_meters, billed_quantity)
        )
      `)
      .in('order.status', relevantStatuses);
    if (scheduledError) throw scheduledError;

    const scheduledOrdersMap = new Map();
    (scheduledData || []).forEach(schedule => {
        const order = schedule.order;
        if (order && !scheduledOrdersMap.has(order.id)) {
             scheduledOrdersMap.set(order.id, {
                ...order,
                production_date: schedule.scheduled_date
            });
        }
    });

    const { data: completedData, error: completedError } = await supabase
      .from('orders')
      .select(`
        id, customer_name, quantity_meters, status, is_launch, details, production_date, billed_at, order_number,
        creator:created_by(full_name),
        actual_delivery_date, delivery_confirmed_at,
        order_items(id, status, fabric_type, quantity_meters, billed_quantity)
      `)
      .in('status', ['completed', 'delivered']);
    if (completedError) throw completedError;

    (completedData || []).forEach(order => {
        if (!scheduledOrdersMap.has(order.id)) {
            scheduledOrdersMap.set(order.id, order);
        }
    });


    allOrders.value = Array.from(scheduledOrdersMap.values()).map((o: any) => ({
        ...o,
        actual_delivery_date: o.actual_delivery_date ? parseISO(o.actual_delivery_date) : null,
    }));

  } catch (err: any) {
    console.error('Erro ao buscar pedidos para entrega:', err.message);
  } finally {
    loading.value = false;
  }
};

const openForceCompleteModal = (order: Order) => {
    selectedOrderForForceComplete.value = order;
    showForceCompleteModal.value = true;
};

const closeForceCompleteModal = () => {
    showForceCompleteModal.value = false;
    selectedOrderForForceComplete.value = null;
};

const confirmForceComplete = async () => {
    if (!selectedOrderForForceComplete.value || !userStore.profile?.id) return;
    isForcingComplete.value = true;
    try {
        const { error } = await supabase.rpc('forcar_conclusao_pedido', {
            p_order_id: selectedOrderForForceComplete.value.id,
            p_admin_id: userStore.profile.id
        });
        if (error) throw error;
        await fetchDeliveryOrders();
        closeForceCompleteModal();
    } catch (err: any) {
        console.error("Erro ao forçar conclusão do pedido:", err);
    } finally {
        isForcingComplete.value = false;
    }
};

const fabricTypesForFilter = computed(() => {
    const fabrics = new Set<string>();
    deliveredOrders.value.forEach(order => {
        if (order.is_launch) {
            order.order_items.forEach(item => {
                if (item.fabric_type) fabrics.add(item.fabric_type);
            });
        } else if (order.details?.fabric_type) {
            fabrics.add(order.details.fabric_type);
        }
    });
    return Array.from(fabrics).sort();
});

const filteredDeliveredOrders = computed(() => {
    let orders = deliveredOrders.value;

    if (historySearch.value) {
        const query = historySearch.value.toLowerCase();
        orders = orders.filter(o =>
            o.customer_name.toLowerCase().includes(query) ||
            o.creator?.full_name?.toLowerCase().includes(query)
        );
    }

    if (selectedFabrics.value.length > 0) {
        orders = orders.filter(o => {
            if (o.is_launch) {
                return o.order_items.some(item => selectedFabrics.value.includes(item.fabric_type));
            } else {
                return o.details?.fabric_type && selectedFabrics.value.includes(o.details.fabric_type);
            }
        });
    }

    return orders;
});


onMounted(fetchDeliveryOrders);

</script>

<style scoped lang="scss">
.delivery-container { padding: 1rem; }
.delivery-board { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
.delivery-column { background-color: rgba(30, 30, 35, 0.7); border-radius: 16px; display: flex; flex-direction: column; border: 1px solid rgba(255, 255, 255, 0.1); max-height: calc(100vh - 280px); }
.to-be-scheduled-column { background-color: rgba(60, 50, 70, 0.6); }
.column-header { padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 0.75rem; }
.column-content { flex-grow: 1; overflow-y: auto; min-height: 200px; }
.order-card { cursor: grab; position: relative; background-color: rgba(45, 45, 55, 0.9); transition: all 0.2s ease-in-out; border: 1px solid transparent; }
.order-card:hover { transform: translateY(-4px); border-color: rgba(var(--v-theme-primary), 0.5); }
.not-draggable {
  cursor: not-allowed !important;
  opacity: 0.8;
}
.not-draggable:hover {
    transform: none !important;
    border-color: transparent !important;
}
.info-line { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #e0e0e0; margin-top: 4px; }
.ghost-card {
    opacity: 0.7;
    border: 2px dashed rgba(171, 71, 188, 0.5); /* Roxo */
    background-color: rgba(171, 71, 188, 0.1);
}
.actions-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 8px; display: flex; justify-content: center; gap: 16px; opacity: 0; transition: opacity 0.2s ease-in-out; }
.order-card:not(.ghost-card):hover .actions-overlay { opacity: 1; }
.confirmed-icon { position: absolute; top: 8px; right: 8px; font-size: 2rem; opacity: 0.5; }
.order-card.confirmed {
  background-color: rgba(76, 175, 80, 0.2) !important;
  border-left: 4px solid #4CAF50;
}
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
:deep(.v-data-table__wrapper tbody tr) {
  cursor: pointer;
}
.dialog-header, .dialog-footer {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
