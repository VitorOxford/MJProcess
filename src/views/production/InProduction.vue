<template>
  <v-container fluid class="pa-md-8 pa-2 fill-height">
    <v-card class="glassmorphism-card mx-auto my-auto pa-2 pa-md-4">
      <v-toolbar color="transparent" class="mb-4 header-toolbar">
        <v-toolbar-title class="font-weight-bold header-title d-flex align-center">
          <v-icon start size="32">mdi-cog-sync-outline</v-icon>
          Kanban de Produção
        </v-toolbar-title>
      </v-toolbar>

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
            <div class="d-flex align-center justify-space-between w-100 mb-2">
                <div class="text-center flex-grow-1">
                    <h4 class="font-weight-bold">{{ day.name }}</h4>
                    <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
                </div>
                <v-tooltip text="Gerar PDF do Dia" location="top">
                    <template v-slot:activator="{ props }">
                    <v-btn
                        v-bind="props"
                        v-if="day.items.length > 0"
                        icon="mdi-file-pdf-box"
                        variant="text"
                        color="red-lighten-2"
                        size="small"
                        @click="generateDailyPdf(day)"
                    ></v-btn>
                    </template>
                </v-tooltip>
            </div>
            <v-chip size="small" variant="tonal" color="primary" class="mb-2">
              {{ formatMeters(getDayProduction(day.date).total) }}m
            </v-chip>
            <div class="limits-breakdown">
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
              v-for="item in day.items"
              :key="item.id"
              class="order-card-kanban my-2"
              variant="flat"
              @click="openDetailModal(item.order_id, item.id)"
              @mousemove="onCardMouseMove"
            >
              <div class="card-border-machine" :style="{'background-color': getMachineTypeForFabric(item.fabric_type) === 'MESA' ? 'var(--v-theme-cyan)' : 'var(--v-theme-amber)'}"></div>
              <v-card-text class="pa-3 d-flex flex-column">
                <div>
                  <p class="customer-title text-truncate mb-1">{{ item.customer_name }}</p>
                </div>
                <div class="d-flex justify-space-between align-center mb-1">
                  <p class="text-caption text-medium-emphasis">#{{ String(item.order_number).padStart(4, '0') }} / {{ item.stamp_ref }}</p>
                  <v-chip size="x-small" :color="statusColorMap[item.status]" label variant="tonal" class="font-weight-bold status-chip">{{ statusDisplayMap[item.status] }}</v-chip>
                </div>
                <v-divider class="my-2"></v-divider>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption font-weight-bold text-truncate">{{ item.creator_name }}</span>
                  <v-chip size="x-small" color="white" variant="flat" class="font-weight-bold meters-chip">
                    {{ formatMeters(item.quantity_meters) }}m
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
            <p v-if="day.items.length === 0" class="text-caption text-grey text-center mt-4">Nenhum item para este dia.</p>
          </div>
        </div>
      </div>

      <OrderDetailModal
        :show="showDetailModal"
        :order-id="selectedOrderId"
        :item-id="selectedItemId"
        @close="closeDetailModal"
      />
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUserStore } from '@/stores/user';
import OrderDetailModal from '@/components/OrderDetailModal.vue';

type ProductionItem = {
  id: string; order_id: string; order_number: number; customer_name: string;
  creator_name: string; fabric_type: string; stamp_ref: string; quantity_meters: number;
  status: string; scheduled_date: string; created_at: string;
  production_start_date?: Date;
};

const userStore = useUserStore();
const loading = ref(true);
const search = ref('');
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));
const allProductionItems = ref<ProductionItem[]>([]);

const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);

const dailyLimits = { mesa: 4000, corrida: 10000, overall: 14000, saturday: 5000 };
const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA',
  'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA'
};
const statusDisplayMap: Record<string, string> = {
    in_printing: 'Impressão', in_cutting: 'Corte'
};
const statusColorMap: Record<string, string> = {
    in_printing: 'info', in_cutting: 'warning'
};

const itemsWithStartDate = computed(() => {
    return allProductionItems.value.map(item => ({
        ...item,
        production_start_date: parseISO(item.scheduled_date)
    }));
});

const filteredItems = computed(() => {
    if (!search.value) return itemsWithStartDate.value;
    const query = search.value.toLowerCase();
    return itemsWithStartDate.value.filter(item =>
        item.customer_name.toLowerCase().includes(query) ||
        (item.creator_name && item.creator_name.toLowerCase().includes(query)) ||
        String(item.order_number).includes(query)
    );
});

const weekDays = computed(() => {
    return Array.from({ length: 6 }, (_, i) => {
        const date = addDays(currentWeekStart.value, i);
        return {
            date,
            name: format(date, 'EEEE', { locale: ptBR }).split('-')[0],
            items: getItemsForDay(date)
        };
    });
});

const fetchInProductionItems = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('production_schedule')
      .select(`
        scheduled_date,
        order:orders!inner(id, customer_name, order_number, creator:created_by(full_name)),
        item:order_items!inner(id, status, quantity_meters, fabric_type, stamp_ref, created_at)
      `)
      .in('item.status', ['in_printing', 'in_cutting']); // <<-- KANBAN LIMPO

    if (error) throw error;

    allProductionItems.value = (data || []).map((entry: any) => ({
      id: entry.item.id,
      order_id: entry.order.id,
      order_number: entry.order.order_number,
      customer_name: entry.order.customer_name,
      creator_name: entry.order.creator?.full_name || 'N/A',
      fabric_type: entry.item.fabric_type,
      stamp_ref: entry.item.stamp_ref,
      quantity_meters: entry.item.quantity_meters,
      status: entry.item.status,
      scheduled_date: entry.scheduled_date,
      created_at: entry.item.created_at,
    }));
  } catch (err) {
    console.error('Erro ao buscar itens em produção:', err);
  } finally {
    loading.value = false;
  }
};

const getItemsForDay = (date: Date) => {
    return filteredItems.value.filter(item =>
        item.production_start_date && isSameDay(item.production_start_date, date)
    );
};

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

const openDetailModal = (orderId: string, itemId: string) => {
    selectedOrderId.value = orderId;
    selectedItemId.value = itemId;
    showDetailModal.value = true;
};

const imageToBase64 = (url: string): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        } else { reject(new Error('Contexto do canvas não obtido')); }
    };
    img.onerror = reject;
    img.src = url;
});

// --- NOVA FUNÇÃO DE PDF ---
const generateDailyPdf = async (day: { date: Date; items: ProductionItem[] }) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const formattedDate = format(day.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    try {
        // Cabeçalho
        const logoUrl = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713';
        const logoBase64 = await imageToBase64(logoUrl);
        const logoProps = doc.getImageProperties(logoBase64);
        const logoWidth = 50;
        const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
        doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text([
            "MR JACKY - 20.631.721/0001-07",
            "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
            "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"
        ], pageWidth - 15, 15, { align: 'right' });

        doc.setFontSize(18); doc.setTextColor(0); doc.text(`Relatório de Produção`, 15, 45);
        doc.setFontSize(12); doc.text(formattedDate, pageWidth - 15, 45, { align: 'right' });
        doc.setLineWidth(0.5); doc.line(15, 50, pageWidth - 15, 50);

        // Tabela de Itens
        const head = [['Pedido #', 'Cliente', 'Vendedor', 'Estampa (Ref.)', 'Tecido', 'Metragem']];
        const body = day.items.map(item => [
            String(item.order_number).padStart(4, '0'),
            item.customer_name,
            item.creator_name,
            item.stamp_ref,
            item.fabric_type,
            `${formatMeters(item.quantity_meters)}m`
        ]);

        autoTable(doc, {
            startY: 55,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            didDrawPage: (data) => {
                // Rodapé
                const footerY = pageHeight - 15;
                doc.setFontSize(9).setTextColor(150).text(`Página ${data.pageNumber} | Gerado com MJProcess`, pageWidth / 2, footerY, { align: 'center' });
            }
        });

        doc.save(`Producao_${format(day.date, 'yyyy-MM-dd')}.pdf`);

    } catch (e) {
        console.error("Não foi possível gerar o PDF diário:", e);
        alert("Ocorreu um erro ao gerar o relatório em PDF.");
    }
};

const closeDetailModal = () => { showDetailModal.value = false; };
const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => fabricMachineMap[fabric] || 'CORRIDA';
const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { currentWeekStart.value = subDays(currentWeekStart.value, 7); };
const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatMeters = (meters: number) => Number(meters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const getDailyLimit = (date: Date) => getDay(date) === 6 ? dailyLimits.saturday : dailyLimits.overall;

const getDayProduction = (date: Date) => {
    const items = getItemsForDay(date);
    const mesa = items.filter(i => getMachineTypeForFabric(i.fabric_type) === 'MESA').reduce((sum, i) => sum + i.quantity_meters, 0);
    const corrida = items.filter(i => getMachineTypeForFabric(i.fabric_type) === 'CORRIDA').reduce((sum, i) => sum + i.quantity_meters, 0);
    return { mesa, corrida, total: mesa + corrida };
};

onMounted(fetchInProductionItems);

</script>

<style scoped lang="scss">
.kanban-page-container {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.week-indicator { min-width: 150px; }
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
.status-chip { margin-left: 8px; }
.meters-chip { margin-left: 8px; background-color: rgba(255, 255, 255, 0.8) !important; color: #1E1E1E !important; }
.card-border-machine {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  z-index: 3;
}
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
</style>
