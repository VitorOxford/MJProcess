<template>
  <v-container fluid class="design-kanban-page">
    <v-toolbar color="transparent" class="mb-4 px-0">
      <v-toolbar-title class="font-weight-bold text-h4 d-flex align-center">
        <v-icon start size="36" color="primary">mdi-palette-swatch-outline</v-icon>
        Fluxo de Design
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <div class="d-flex align-center ga-2">
        <v-text-field
          ref="searchFieldRef"
          v-model="searchQuery"
          variant="solo-filled"
          flat
          density="compact"
          label="Buscar item..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          style="width: 350px;"
        ></v-text-field>
        <v-tooltip location="bottom">
            <template #activator="{ props }">
                 <v-btn v-bind="props" ref="historyButtonRef" icon="mdi-history" variant="text" @click="openHistoryModal"></v-btn>
            </template>
            <span>Histórico de Liberações</span>
        </v-tooltip>
        <v-tooltip location="bottom">
            <template #activator="{ props }">
                <v-btn v-bind="props" ref="hintButtonRef" :icon="hintsEnabled ? 'mdi-lightbulb-on-outline' : 'mdi-lightbulb-off-outline'" variant="text" @click="toggleHints" :color="hintsEnabled ? 'amber' : ''"/>
            </template>
            <span>{{ hintsEnabled ? 'Desativar Dicas Visuais' : 'Ativar Dicas Visuais' }}</span>
        </v-tooltip>
      </div>
    </v-toolbar>

    <div v-if="tutorialStep > 0" class="tutorial-click-overlay" @click="advanceTutorial"></div>
     <transition name="fade">
      <div v-if="tutorialStep > 0" class="tutorial-highlight" :style="highlightStyle"></div>
    </transition>
    <transition name="hint-bounce">
      <div v-if="tutorialStep > 0" ref="hintBubbleRef" class="hint-bubble" :style="hintPosition">
        <div class="hint-bubble-content">
          <v-icon start size="small">{{ hintContent.icon }}</v-icon>
          <span v-html="hintContent.text"></span>
        </div>
      </div>
    </transition>


    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else class="kanban-board-container custom-scrollbar">
      <div class="kanban-board">
        <div v-for="(column, index) in columns" :key="column.id" class="kanban-column" :style="{ '--animation-delay': `${index * 0.2}s` }">
          <div class="column-header">
            <v-icon :color="column.color" class="mr-3">{{ column.icon }}</v-icon>
            <h3 class="column-title">{{ column.title }}</h3>
            <v-chip size="small" variant="tonal" class="ml-auto" :color="column.color">{{ column.items.length }}</v-chip>
          </div>

          <draggable
            :list="column.items"
            group="items"
            item-key="id"
            class="column-content custom-scrollbar"
            :disabled="column.id === 4"
            @end="onDragEnd"
          >
            <template #item="{ element: item }">
               <div :data-id="item.id" @mousemove="onCardMouseMove">
                  <v-card class="order-card my-2" variant="flat" @click="openModalForItem(item)">
                    <div v-if="item.status === 'customer_approval'" class="approval-badge">
                        <v-icon size="small">mdi-account-clock-outline</v-icon>
                        <v-tooltip activator="parent" location="top">Aguardando aprovação do vendedor</v-tooltip>
                    </div>
                     <div class="card-border"></div>
                     <div class="card-shine"></div>
                     <v-card-text class="card-content">
                       <p class="font-weight-bold text-body-1">{{ item.order.customer_name }}</p>
                       <p class="text-caption text-medium-emphasis mt-1">Ref: {{ item.stamp_ref }}</p>
                       <v-divider class="my-2"></v-divider>
                       <v-chip size="small">{{ item.fabric_type }} - {{ Number(item.quantity_meters).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}m</v-chip>
                     </v-card-text>
                  </v-card>
               </div>
            </template>
          </draggable>
           <div v-if="column.items.length === 0" class="empty-column">
              <v-icon size="48" class="mb-2 text-grey-darken-2">mdi-tray-arrow-down</v-icon>
              <span>Nenhum item aqui.</span>
          </div>
        </div>
      </div>
    </div>

    <LaunchDetailModal
      :show="showLaunchModal"
      :order-id="selectedOrderId"
      :item-id="selectedItemId"
      @close="closeLaunchModal"
      @sendToSeller="openUploadModal"
      @releaseItem="handleReleaseItem"
      @itemUpdated="fetchDesignOrders"
    />
    <FileUploadModal
      :show="showUploadModal"
      :order="selectedOrder"
      :title="uploadModalTitle"
      @close="showUploadModal = false"
      @uploaded="handleUploadSuccess"
    />
    <ReleasedForProductionModal
      :show="showHistoryModal"
      :loading="loadingHistory"
      :released-items="releasedItemsHistory"
      @close="showHistoryModal = false"
      @generate-op="generateOpPdf"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onActivated, reactive, nextTick } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import draggable from 'vuedraggable';
import LaunchDetailModal from '@/components/LaunchDetailModal.vue';
import FileUploadModal from '@/components/FileUploadModal.vue';
// ===== INÍCIO DA CORREÇÃO =====
import ReleasedForProductionModal from '../../components/design/ReleasedForProductionModal.vue';
// ===== FIM DA CORREÇÃO =====
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- TIPAGEM ---
type OrderItem = {
    id: string;
    status: string;
    design_tag: 'Desenvolvimento' | 'Alteração' | 'Finalização' | 'Aprovado';
    order_id: string;
    order: Order;
    unit_of_measure: 'metro' | 'kg' | null;
    quantity_unit: number | null;
    is_op_generated: boolean;
    [key: string]: any
};
type Order = { id: string; status: string; is_launch: boolean; order_items: OrderItem[]; created_at: string; order_number: number; creator: { full_name: string }; [key: string]: any };

// --- ESTADO ---
const loading = ref(true);
const allOrders = ref<Order[]>([]);
const userStore = useUserStore();
const showLaunchModal = ref(false);
const selectedOrder = ref<Order | null>(null);
const selectedOrderId = ref<string | null>(null);
const showUploadModal = ref(false);
const selectedItem = ref<OrderItem | null>(null);
const uploadModalTitle = ref('');
const selectedItemId = ref<string | null>(null);

const searchQuery = ref('');

// --- NOVO ESTADO PARA O HISTÓRICO ---
const showHistoryModal = ref(false);
const loadingHistory = ref(false);
const releasedItemsHistory = ref<OrderItem[]>([]);

// ===== ESTADO DO TUTORIAL =====
const hintsEnabled = ref(JSON.parse(localStorage.getItem('DesignKanbanHints') ?? 'true'));
const tutorialStep = ref(0); // 0 = inativo, 1 = busca, 2 = histórico, 3 = desativar
const hintPosition = ref({});
const highlightStyle = ref({});
const hintContent = reactive({ icon: '', text: '' });
const searchFieldRef = ref(null);
const historyButtonRef = ref(null);
const hintButtonRef = ref(null);
const hintBubbleRef = ref<HTMLElement | null>(null);


// --- LÓGICA DE DADOS ---
const fetchDesignOrders = async () => {
  loading.value = true;
  try {
    const designStatuses = [
        'design_pending',
        'customer_approval',
        'changes_requested',
        'approved_by_designer',
        'approved_by_seller'
    ];

    const { data, error } = await supabase.from('orders')
      .select(`
        id, customer_name, status, is_launch, created_at, order_number,
        creator:created_by(full_name),
        designer:designer_id(full_name),
        order_items!inner(*)
      `)
      .in('order_items.status', designStatuses);

    if (error) throw error;
    allOrders.value = (data as any[]) || [];
  } finally {
    loading.value = false;
  }
};

const filteredItems = computed((): OrderItem[] => {
    const allItems = allOrders.value.flatMap(order =>
        order.order_items.map(item => ({
            ...item,
            order: order
        }))
    );
    if (!searchQuery.value) return allItems;

    const query = searchQuery.value.toLowerCase();
    return allItems.filter(item =>
        item.order.customer_name?.toLowerCase().includes(query) ||
        item.order.creator?.full_name?.toLowerCase().includes(query) ||
        item.stamp_ref?.toLowerCase().includes(query) ||
        item.fabric_type?.toLowerCase().includes(query) ||
        String(item.order.order_number).includes(query)
    );
});


const developmentItems = computed(() => filteredItems.value.filter(item => item.status === 'design_pending' && item.design_tag === 'Desenvolvimento'));
const alterationItems = computed(() => filteredItems.value.filter(item => item.status === 'design_pending' && item.design_tag === 'Alteração'));
const finalizationItems = computed(() => filteredItems.value.filter(item => item.status === 'design_pending' && item.design_tag === 'Finalização'));

const approvedItems = computed(() => filteredItems.value.filter(item =>
    (item.status === 'design_pending' && item.design_tag === 'Aprovado') ||
    item.status === 'customer_approval' ||
    item.status === 'approved_by_seller'
));


const columns = computed(() => [
  { id: 1, title: 'Desenvolvimento', icon: 'mdi-lightbulb-on-outline', color: '#40c4ff', items: developmentItems.value },
  { id: 2, title: 'Alteração', icon: 'mdi-swap-horizontal-bold', color: '#ffab40', items: alterationItems.value },
  { id: 3, title: 'Finalização', icon: 'mdi-flag-checkered', color: '#26A69A', items: finalizationItems.value },
  { id: 4, title: 'Aprovados', icon: 'mdi-check-decagram', color: '#4CAF50', items: approvedItems.value },
]);

// --- MÉTODOS DE INTERAÇÃO ---

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

const openModalForItem = (item: OrderItem) => {
  selectedOrderId.value = item.order_id;
  selectedItemId.value = item.id;
  showLaunchModal.value = true;
};

const closeLaunchModal = () => {
  showLaunchModal.value = false;
  selectedOrderId.value = null;
  selectedItemId.value = null;
};

const openUploadModal = (item: OrderItem) => {
    selectedItem.value = item;
    selectedOrder.value = allOrders.value.find(o => o.id === item.order_id) || null;
    uploadModalTitle.value = `Enviar Arte para "${item.stamp_ref}"`;
    showUploadModal.value = true;
};

const handleUploadSuccess = async (fileUrl: string) => {
    if (!selectedItem.value) return;

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ designer_id: userStore.profile?.id })
      .eq('id', selectedItem.value.order_id);

    if (updateOrderError) console.error("Falha ao registrar designer no pedido:", updateOrderError);

    await updateItemStatus(selectedItem.value, 'customer_approval', fileUrl);

    const { error: notifyError } = await supabase.rpc('notify_seller_for_approval', {
        p_item_id: selectedItem.value.id,
        p_sender_id: userStore.profile?.id
    });
    if (notifyError) console.error("Erro ao notificar vendedor:", notifyError);

    showUploadModal.value = false;
};

const updateItemStatus = async (item: OrderItem, newStatus: string, fileUrl?: string) => {
    try {
        const { error } = await supabase.rpc('update_order_item_status', { p_item_id: item.id, p_new_status: newStatus, p_final_art_url: fileUrl || null, p_profile_id: userStore.profile?.id });
        if (error) throw error;
        await fetchDesignOrders();
    } catch (err: any) { console.error("Erro ao atualizar status do item:", err); }
};

const removeItemFromLocalState = (itemId: string) => {
    let orderIndexToRemove = -1;
    allOrders.value.forEach((order, index) => {
        const itemIndex = order.order_items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            order.order_items.splice(itemIndex, 1);
        }
        if (order.order_items.length === 0) {
            orderIndexToRemove = index;
        }
    });
    if (orderIndexToRemove !== -1) {
        allOrders.value.splice(orderIndexToRemove, 1);
    }
};

const handleReleaseItem = async (item: OrderItem) => {
    try {
        const { error } = await supabase.rpc('schedule_item_for_production', {
            p_item_id: item.id,
            p_profile_id: userStore.profile?.id
        });
        if (error) throw error;
        removeItemFromLocalState(item.id);
        if (selectedOrderId.value) {
            closeLaunchModal();
        }
    } catch(err: any) {
        console.error("Erro ao liberar item para produção:", err);
        alert(`Erro ao liberar item: ${err.message}`);
    }
};

const onDragEnd = async (event: any) => {
};

// --- NOVOS MÉTODOS PARA HISTÓRICO ---
const fetchReleasedItemsHistory = async () => {
    if (!userStore.profile) return [];
    loadingHistory.value = true;
    try {
        const { data, error } = await supabase
            .from('order_items')
            .select(`
                *,
                order:orders!inner(
                    id, customer_name, created_at, order_number,
                    creator:created_by(full_name),
                    order_items(*)
                )
            `)
            .eq('order.designer_id', userStore.profile.id)
            .in('status', ['production_queue', 'in_printing', 'in_cutting', 'completed'])
            .order('created_at', { ascending: false, foreignTable: 'orders' })
            .limit(50);
        if (error) throw error;
        releasedItemsHistory.value = data || [];
    } catch(err) {
        console.error("Erro ao buscar histórico de itens liberados:", err);
    } finally {
        loadingHistory.value = false;
    }
}

const openHistoryModal = () => {
    fetchReleasedItemsHistory();
    showHistoryModal.value = true;
};

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

const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        const dayOfWeek = newDate.getDay();
        if ([2, 4, 6].includes(dayOfWeek)) { return newDate; }
        newDate.setDate(newDate.getDate() + 1);
    }
};

const imageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if(ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject(new Error('Could not get canvas context'));
            }
        };
        img.onerror = reject;
        img.src = url;
    });
};

const generateOpPdf = async (item: OrderItem) => {
  try {
    const { data: opNumber, error: rpcError } = await supabase.rpc('generate_op_number', { p_item_id: item.id });
    if (rpcError) throw rpcError;

    const { data: schedule, error: scheduleError } = await supabase
      .from('production_schedule')
      .select('scheduled_date')
      .eq('order_item_id', item.id)
      .single();
    if (scheduleError) throw scheduleError;
    if (!schedule) throw new Error('Agendamento do item não encontrado.');

    const completionDate = addBusinessDays(parseISO(schedule.scheduled_date), 3);
    const forecastDate = getNextDeliveryDay(completionDate);

    const formattedOpNumber = String(opNumber).padStart(4, '0');
    const formattedForecastDate = format(forecastDate, 'dd/MM/yyyy', { locale: ptBR });
    const formattedOrderNumber = String(item.order.order_number).padStart(4, '0');

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    const [logoBase64, artBase64] = await Promise.all([
      imageToBase64('https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713'),
      imageToBase64(item.stamp_image_url || '')
    ]);

    const logoProps = doc.getImageProperties(logoBase64);
    const logoWidth = 50;
    const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
    doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);

    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(["MR JACKY - 20.631.721/0001-07", "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000", "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"], pageWidth - 15, 15, { align: 'right' });

    const itemIndex = item.order.order_items.findIndex((oi: any) => oi.id === item.id) + 1;
    const totalItems = item.order.order_items.length;
    const itemSubtitle = `Item ${itemIndex} de ${totalItems}`;

    doc.setFontSize(18); doc.setTextColor(0); doc.text(`OP #${formattedOpNumber}`, 15, 45);
    doc.setFontSize(12); doc.text(`Pedido #${formattedOrderNumber}`, pageWidth - 15, 45, { align: 'right' });
    doc.setFontSize(10); doc.setTextColor(100); doc.text(itemSubtitle, pageWidth - 15, 51, { align: 'right' });
    doc.setLineWidth(0.5); doc.line(15, 55, pageWidth - 15, 55);

    autoTable(doc, {
        startY: 60,
        head: [['CLIENTE', 'VENDEDOR', 'EMISSÃO', 'PREVISÃO DE ENTREGA']],
        body: [[item.order.customer_name, item.order.creator?.full_name || 'N/A', format(new Date(item.order.created_at), 'dd/MM/yyyy'), formattedForecastDate]],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    let quantityDisplay = `${item.quantity_meters.toLocaleString('pt-BR')}m`;
    if (item.unit_of_measure === 'kg') {
      const originalKg = item.quantity_unit?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) || 'N/A';
      quantityDisplay = `${originalKg}kg (Rendimento: ~${item.quantity_meters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m)`;
    }

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['PRODUTO (BASE)', 'SERVIÇO (ESTAMPA)', 'QUANTIDADE']],
        body: [[ item.fabric_type, item.stamp_ref, quantityDisplay ]],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    const artStartY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('ARTE APROVADA', 15, artStartY);

    const artY = artStartY + 5;
    const maxImgWidth = pageWidth - 30;
    const maxImgHeight = pageHeight - artY - 25;
    const imgProps = doc.getImageProperties(artBase64);
    const ratio = Math.min(maxImgWidth / imgProps.width, maxImgHeight / imgProps.height);
    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;
    const imgXCentered = (pageWidth - imgWidth) / 2;

    doc.setDrawColor(180, 180, 180).setLineWidth(0.5).rect(imgXCentered - 1, artY - 1, imgWidth + 2, imgHeight + 2, 'S');
    doc.addImage(artBase64, 'PNG', imgXCentered, artY, imgWidth, imgHeight);

    const footerY = pageHeight - 15;
    doc.setFontSize(9).setTextColor(150).text('OP gerada com MJProcess', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`OP-${formattedOpNumber}-${item.order.customer_name}-${item.stamp_ref}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Não foi possível gerar o PDF. Verifique se as imagens estão acessíveis e tente novamente.");
  }
};

// ===== LÓGICA DO TUTORIAL =====
const setHintPosition = async (el: any) => {
  if (!el || !el.$el) return;
  await nextTick();
  const rect = el.$el.getBoundingClientRect();

  highlightStyle.value = {
    top: `${rect.top - 4}px`,
    left: `${rect.left - 4}px`,
    width: `${rect.width + 8}px`,
    height: `${rect.height + 8}px`,
  };

  await nextTick();
  const bubbleEl = hintBubbleRef.value;
  if (!bubbleEl) return;

  const bubbleRect = bubbleEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const margin = 16;

  let idealLeft = rect.left + (rect.width / 2);

  if (idealLeft - (bubbleRect.width / 2) < margin) {
    idealLeft = margin + (bubbleRect.width / 2);
  }
  if (idealLeft + (bubbleRect.width / 2) > viewportWidth - margin) {
    idealLeft = viewportWidth - margin - (bubbleRect.width / 2);
  }

  hintPosition.value = {
    top: `${rect.bottom + 12}px`,
    left: `${idealLeft}px`,
    transform: 'translateX(-50%)',
    opacity: 1,
  };
};

const startTutorial = async () => {
    if (!hintsEnabled.value || tutorialStep.value !== 0) return;
    await nextTick();

    setTimeout(() => {
        tutorialStep.value = 1;
        setHintPosition(searchFieldRef.value);
        hintContent.icon = 'mdi-magnify';
        hintContent.text = 'Use a <strong>busca</strong> para filtrar itens por cliente, vendedor, ref., etc.';
    }, 500);
}

const advanceTutorial = () => {
    tutorialStep.value++;
    if (tutorialStep.value === 2) {
        setHintPosition(historyButtonRef.value);
        hintContent.icon = 'mdi-history';
        hintContent.text = 'Acesse aqui o <strong>histórico</strong> de todos os itens que você já liberou. Libere OPs por aqui também!';
    } else if (tutorialStep.value === 3) {
        setHintPosition(hintButtonRef.value);
        hintContent.icon = 'mdi-lightbulb-off-outline';
        hintContent.text = 'Clique aqui para <strong>desativar estas dicas</strong>. Você pode reativá-las a qualquer momento.';
    } else {
        tutorialStep.value = 0;
        localStorage.setItem('DesignKanbanHints', 'false');
        hintsEnabled.value = false;
    }
}

const toggleHints = () => {
  hintsEnabled.value = !hintsEnabled.value;
  localStorage.setItem('DesignKanbanHints', JSON.stringify(hintsEnabled.value));
  if (!hintsEnabled.value) {
      tutorialStep.value = 0;
  }
};


onActivated(() => {
    fetchDesignOrders();
    startTutorial();
});
onMounted(() => {
    fetchDesignOrders();
    startTutorial();
});
</script>

<style scoped lang="scss">
@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0px); } }
@keyframes pulse-yellow {
  0% { box-shadow: 0 0 0 0 rgba(255, 171, 64, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 171, 64, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 171, 64, 0); }
}

/* ===== ESTILOS DO TUTORIAL REFINADOS ===== */
@keyframes pulse-blue {
  0% { box-shadow: 0 0 0 0 rgba(66, 165, 245, 0.6); }
  70% { box-shadow: 0 0 0 12px rgba(66, 165, 245, 0); }
  100% { box-shadow: 0 0 0 0 rgba(66, 165, 245, 0); }
}

.tutorial-click-overlay {
  position: fixed;
  inset: 0;
  z-index: 1001;
  cursor: pointer;
}

.tutorial-highlight {
  position: fixed;
  z-index: 1000;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(12, 12, 12, 0.7);
  border: 2px solid #42a5f5;
  animation: pulse-blue 2.5s infinite;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.hint-bubble {
  position: fixed;
  z-index: 1002;
  pointer-events: none;
  width: max-content;
  max-width: 320px;
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  .hint-bubble-content {
    display: flex;
    align-items: center;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #e0e0e0;
    background-color: rgba(45, 45, 55, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    white-space: normal;
    text-align: left;
    position: relative;

  }
}

.hint-bounce-enter-active { animation: hint-bounce-in 0.5s cubic-bezier(.68,-0.55,.27,1.55); }
.hint-bounce-leave-active { animation: hint-bounce-out 0.3s ease-in; }
@keyframes hint-bounce-in {
  0% { opacity: 0; transform: translateY(10px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes hint-bounce-out {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.9); }
}
/* ===== FIM DOS ESTILOS DO TUTORIAL ===== */


.design-kanban-page {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kanban-board-container {
  flex-grow: 1;
  overflow-x: auto;
  padding-bottom: 2rem;
}

.kanban-board {
  display: flex;
  gap: 2rem;
  min-width: fit-content;
  padding: 1rem;
  height: 100%;
}

.kanban-column {
  width: 340px;
  flex-shrink: 0;
  background-color: rgba(25, 25, 30, 0.6);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  animation: float 8s ease-in-out infinite;
  transition: all 0.4s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);

  &:hover {
    transform: scale(1.03) translateY(-7px) !important;
    box-shadow: 0 25px 50px rgba(0,0,0,0.4);
  }
}

.column-header {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  .column-title {
    font-size: 1.1rem;
    font-weight: bold;
  }
}

.column-content {
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem 1rem 1rem 1rem;
}

.order-card {
  cursor: pointer;
  background-color: rgba(35, 35, 45, 0.8);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  transition: transform 0.2s ease-out;

  .card-content { z-index: 2; }

  .card-border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.2), transparent 40%);
    opacity: 0;
    transition: opacity 0.4s;
  }
  &:hover .card-border { opacity: 1; }
}

.approval-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  width: 24px;
  height: 24px;
  background-color: #FFAB40;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(255, 171, 64, 0.8);
  color: white;
  animation: pulse-yellow 2s infinite;
}

.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  color: #616161;
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
</style>
