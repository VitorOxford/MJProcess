<template>
  <v-dialog v-model="dialog" max-width="1100px" persistent scrollable>
    <v-card class="calendar-modal-card">
      <v-toolbar color="transparent" class="pr-2 glass-toolbar">
        <v-toolbar-title class="font-weight-bold">
          <v-icon start>mdi-calendar-month-outline</v-icon>
          Calendário de Produção
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false"></v-btn>
      </v-toolbar>

      <v-card-text class="pa-0">
        <v-row no-gutters class="fill-height">
          <v-col cols="12" md="8" class="calendar-container pa-4">
            <v-date-picker
              v-model="selectedDate"
              color="primary"
              :events="events"
              show-adjacent-months
              hide-header
              class="custom-date-picker"
              @update:month="onMonthUpdate"
              @update:year="onMonthUpdate"
              @update:modelValue="updateSelectedDayOrders"
            >
              <template #header="{ 'onUpdate:month': onUpdateMonth, month, year }">
                  <div class="custom-picker-header">
                      <v-btn icon="mdi-chevron-left" variant="text" @click="changeMonth(-1)"></v-btn>
                      <div class="month-year-display">
                          {{ format(new Date(year, month), 'MMMM yyyy', { locale: ptBR }) }}
                      </div>
                      <v-btn icon="mdi-chevron-right" variant="text" @click="changeMonth(1)"></v-btn>
                  </div>
              </template>
            </v-date-picker>
          </v-col>

          <v-col cols="12" md="4" class="day-details-panel">
            <div class="day-details-header">
              <h3 class="text-h6">{{ formatDate(selectedDate, "EEEE, dd 'de' MMMM") }}</h3>
              <v-chip size="small" :color="selectedDayUsage.total > dailyLimits.overall ? 'error' : 'default'" variant="tonal">
                Total: {{ selectedDayUsage.total.toLocaleString('pt-BR') }}m / {{ dailyLimits.overall.toLocaleString('pt-BR') }}m
              </v-chip>
            </div>

            <div class="day-details-content">
              <div class="machine-usage-details mb-4">
                  <div class="mb-3">
                      <div class="d-flex justify-space-between align-center text-body-2 mb-1">
                          <span class="font-weight-bold">Máquina MESA</span>
                          <span :class="{'text-error': selectedDayUsage.mesa > dailyLimits.mesa}">{{ selectedDayUsage.mesa.toLocaleString('pt-BR') }}m / {{ dailyLimits.mesa.toLocaleString('pt-BR') }}m</span>
                      </div>
                      <v-progress-linear :model-value="(selectedDayUsage.mesa / dailyLimits.mesa) * 100" :color="selectedDayUsage.mesa > dailyLimits.mesa ? 'error' : 'cyan'" height="6" rounded></v-progress-linear>
                  </div>
                  <div>
                      <div class="d-flex justify-space-between align-center text-body-2 mb-1">
                          <span class="font-weight-bold">Máquina CORRIDA</span>
                          <span :class="{'text-error': selectedDayUsage.corrida > dailyLimits.corrida}">{{ selectedDayUsage.corrida.toLocaleString('pt-BR') }}m / {{ dailyLimits.corrida.toLocaleString('pt-BR') }}m</span>
                      </div>
                      <v-progress-linear :model-value="(selectedDayUsage.corrida / dailyLimits.corrida) * 100" :color="selectedDayUsage.corrida > dailyLimits.corrida ? 'error' : 'amber'" height="6" rounded></v-progress-linear>
                  </div>
              </div>
              <v-divider></v-divider>

              <div v-if="selectedDayOrders.length > 0" class="mt-4">
                <v-card v-for="order in selectedDayOrders" :key="order.id" class="order-detail-card mb-3" variant="outlined">
                  <v-list-item class="pa-3">
                    <v-list-item-title class="font-weight-bold text-body-1 mb-1">{{ order.customer_name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ order.details.fabric_type }} ({{ getMachineTypeForFabric(order.details.fabric_type) }})</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-chip :color="getMachineTypeForFabric(order.details.fabric_type) === 'MESA' ? 'cyan' : 'amber'" variant="flat" size="small">{{ order.quantity_meters }}m</v-chip>
                    </template>
                  </v-list-item>
                </v-card>
              </div>
              <div v-else class="empty-day d-flex flex-column align-center justify-center fill-height">
                <v-icon size="64" class="mb-4 text-medium-emphasis">mdi-calendar-check-outline</v-icon>
                <p class="text-h6 font-weight-regular text-medium-emphasis">Nenhum pedido agendado</p>
                <p class="text-body-2 text-disabled">Selecione um dia para ver os detalhes.</p>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { format, getDay, isValid, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- TIPAGEM E PROPS ---
type Order = {
  id: string; customer_name: string; quantity_meters: number; production_date: string;
  details: { fabric_type: string; };
};
const props = defineProps<{ show: boolean; orders: Order[]; }>();
const emit = defineEmits(['update:show']);

const dialog = computed({ get: () => props.show, set: (val) => emit('update:show', val) });

// --- LÓGICA DE MÁQUINAS E LIMITES ---
const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA',
  'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA'
};

const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => {
  return fabricMachineMap[fabric] || 'CORRIDA'; // Padrão para CORRIDA se não encontrar
};

const dailyLimits = {
  mesa: 4000,
  corrida: 10000,
  overall: 14000,
  saturday: 5000
};

// --- ESTADO DO COMPONENTE ---
const selectedDate = ref<Date | null>(new Date());
const selectedDayOrders = ref<Order[]>([]);

const changeMonth = (direction: 1 | -1) => {
    if (selectedDate.value) {
        selectedDate.value = direction > 0 ? addMonths(selectedDate.value, 1) : subMonths(selectedDate.value, 1);
    }
}

// --- LÓGICA DE CÁLCULO ---
const productionByDay = computed(() => {
  const map = new Map<string, { total: number; mesa: number; corrida: number; orders: Order[] }>();
  for (const order of props.orders) {
    if (order.production_date) {
      const dateKey = format(parseISO(order.production_date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, { total: 0, mesa: 0, corrida: 0, orders: [] });
      }
      const dayData = map.get(dateKey)!;
      const machine = getMachineTypeForFabric(order.details.fabric_type);

      dayData.total += order.quantity_meters;
      dayData.orders.push(order);
      if (machine === 'MESA') {
        dayData.mesa += order.quantity_meters;
      } else {
        dayData.corrida += order.quantity_meters;
      }
    }
  }
  return map;
});

const selectedDayUsage = computed(() => {
  if (!selectedDate.value) return { total: 0, mesa: 0, corrida: 0 };
  const dateKey = format(selectedDate.value, 'yyyy-MM-dd');
  const data = productionByDay.value.get(dateKey);
  return {
    total: data?.total || 0,
    mesa: data?.mesa || 0,
    corrida: data?.corrida || 0,
  };
});


const events = (date: any): string | boolean => {
  if (!date || !isValid(date)) return false;
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayData = productionByDay.value.get(dateKey);
  if (!dayData) return false;

  const isSaturday = getDay(date) === 6;
  const overallLimit = isSaturday ? dailyLimits.saturday : dailyLimits.overall;

  if (dayData.total >= overallLimit || dayData.mesa >= dailyLimits.mesa || dayData.corrida >= dailyLimits.corrida) {
      return 'error';
  }
  return 'primary';
};

const onMonthUpdate = () => {};

const updateSelectedDayOrders = (date: Date | null) => {
  if (!date || !isValid(date)) {
    selectedDayOrders.value = []; return;
  }
  const dateKey = format(date, 'yyyy-MM-dd');
  selectedDayOrders.value = productionByDay.value.get(dateKey)?.orders || [];
};

const formatDate = (date: Date | null, formatString: string): string => {
  if (!date || !isValid(date)) return 'Selecione uma data';
  return format(date, formatString, { locale: ptBR });
};

watch(selectedDate, (newDate) => {
  updateSelectedDayOrders(newDate);
}, { immediate: true });

watch(() => props.show, (newVal) => {
  if (newVal) {
    updateSelectedDayOrders(selectedDate.value);
  }
});
</script>

<style lang="scss">
.calendar-modal-card {
  backdrop-filter: blur(25px) saturate(150%);
  -webkit-backdrop-filter: blur(25px) saturate(150%);
  background-color: rgba(30, 30, 35, 0.75) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  height: 80vh;
}
.glass-toolbar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.calendar-container, .day-details-panel {
  height: 100%;
}
.day-details-panel {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}
.day-details-header {
  padding: 24px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  h3 { text-transform: capitalize; }
}
.day-details-content {
  padding: 24px;
  overflow-y: auto;
  flex-grow: 1;
}
.order-detail-card {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  transition: all 0.2s ease;
  &:hover {
    background-color: rgba(var(--v-theme-primary-rgb), 0.1) !important;
    border-color: rgba(var(--v-theme-primary-rgb), 0.5) !important;
  }
}
.custom-date-picker {
  height: 100%;
  width: 100%;
  background-color: transparent !important;
  .v-picker-title { display: none !important; }
  .v-date-picker-controls { display: none !important; }
  .custom-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    .month-year-display {
        font-size: 1.2rem;
        font-weight: 500;
        text-transform: capitalize;
    }
  }
  .v-date-picker-month { padding: 0 16px; }
  .v-date-picker-month__day {
    .v-btn {
      border-radius: 50% !important;
      border: 2px solid transparent !important;
      transition: all 0.2s ease;
      .v-date-picker-month__day-event { height: 6px; width: 6px; bottom: 6px; }
    }
    .v-btn:hover { background-color: rgba(var(--v-theme-primary-rgb), 0.1); }
    .v-btn.v-btn--active:not(.v-btn--disabled) {
      border: 2px solid rgb(var(--v-theme-primary)) !important;
      background-color: transparent !important;
    }
  }
  .v-date-picker-month__weekday { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); }
}
</style>
