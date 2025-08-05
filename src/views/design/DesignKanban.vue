<template>
  <v-container fluid>
    <v-toolbar color="transparent" class="mb-4">
      <v-toolbar-title class="font-weight-bold">
        <v-icon start>mdi-palette-swatch-outline</v-icon>
        Fila do Design
      </v-toolbar-title>
    </v-toolbar>

    <div class="kanban-board-container">
      <div class="kanban-board">
        <div v-for="column in columns" :key="column.id" class="kanban-column">
          <div class="column-header">
            <v-icon :color="column.color" class="mr-2">{{ column.icon }}</v-icon>
            <h3 class="column-title">{{ column.title }}</h3>
            <v-chip size="small" variant="tonal" class="ml-2">{{ getColumnOrders(column.statuses).length }}</v-chip>
          </div>

          <draggable
            :list="getColumnOrders(column.statuses)"
            group="orders"
            item-key="id"
            class="column-content"
            :data-status="column.statuses[0]"
            @end="onDragEnd"
          >
            <template #item="{ element: order }">
               <div :data-id="order.id">
                  <v-card
                     class="order-card mb-3"
                     elevation="2"
                     @click="openDetailModal(order.id)"
                  >
                     <v-card-text>
                       <div class="d-flex justify-space-between align-center">
                          <p class="font-weight-bold text-body-1">{{ order.customer_name }}</p>
                          <v-chip size="x-small" :color="getStatusColor(order.status)" variant="flat">{{ statusDisplayMap[order.status] }}</v-chip>
                       </div>
                       <p class="text-caption text-grey-lighten-1 mt-1">
                          {{ order.details.fabric_type }} - {{ order.quantity_meters }}m
                       </p>
                       <v-divider class="my-2"></v-divider>
                       <p class="text-caption text-truncate">{{ order.details.stamp_details }}</p>
                     </v-card-text>
                  </v-card>
               </div>
            </template>
          </draggable>

          <div v-if="getColumnOrders(column.statuses).length === 0 && !loading" class="empty-column text-center text-grey">
              Nenhum pedido aqui.
          </div>
        </div>
      </div>
    </div>

     <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4">Buscando pedidos...</p>
     </div>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" @close="showDetailModal = false" />
    <FileUploadModal :show="showUploadModal" :order="selectedOrder" :title="uploadModalTitle" @close="cancelMove" @uploaded="handleUploadSuccess" />

  </v-container>
</template>

<script setup lang="ts">
// SEU SCRIPT ATUAL SEM ALTERAÇÕES
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import draggable from 'vuedraggable';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import FileUploadModal from '@/components/FileUploadModal.vue';
import { useUserStore } from '@/stores/user';

type DesignStatus = 'design_pending' | 'in_design' | 'changes_requested' | 'finalizing' | 'customer_approval';
type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  status: DesignStatus;
  created_by: string;
  details: {
    stamp_details: string;
    fabric_type: string;
    final_art_url?: string;
  };
};

const orders = ref<Order[]>([]);
const loading = ref(true);
const userStore = useUserStore();
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const showUploadModal = ref(false);
const selectedOrder = ref<Order | null>(null);
const uploadModalTitle = ref('');
const pendingMove = ref<{ order: Order; newStatus: DesignStatus } | null>(null);

const columns = ref([
  { id: 1, title: 'Fila de Espera', icon: 'mdi-clock-outline', color: 'blue-grey', statuses: ['design_pending'] },
  { id: 2, title: 'Em Desenvolvimento', icon: 'mdi-pencil-ruler', color: 'blue', statuses: ['in_design'] },
  { id: 3, title: 'Alteração Solicitada', icon: 'mdi-alert-circle-outline', color: 'red', statuses: ['changes_requested'] },
  { id: 4, title: 'Finalização', icon: 'mdi-star-outline', color: 'purple', statuses: ['finalizing'], requiresUpload: true },
  { id: 5, title: 'Aprovação Pendente', icon: 'mdi-send-check-outline', color: 'orange', statuses: ['customer_approval'], requiresUpload: true },
]);

const statusDisplayMap: Record<DesignStatus, string> = {
    design_pending: 'Aguardando Design', in_design: 'Em Design', changes_requested: 'Em Alteração',
    finalizing: 'Finalizando', customer_approval: 'Aprovação Pendente'
};

const getColumnOrders = (statuses: DesignStatus[]) => {
    return orders.value.filter(order => statuses.includes(order.status));
};

const getStatusColor = (status: DesignStatus) => columns.value.find(c => c.statuses.includes(status))?.color || 'grey';

const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};

const onDragEnd = async (event: any) => {
    const { item, to, from } = event;
    const orderId = item.dataset?.id;

    if (!orderId) {
      console.error('ID do pedido não encontrado no elemento arrastado.');
      return;
    }

    if (!userStore.profile) {
      console.error('Perfil do usuário não carregado, abortando ação de drag-and-drop.');
      return;
    }

    const order = orders.value.find(o => o.id === orderId);
    if (!order) return;

    const fromStatus = from.getAttribute('data-status') as DesignStatus;
    const newStatus = to.getAttribute('data-status') as DesignStatus;

    if (fromStatus === newStatus) return;

    const destinationColumn = columns.value.find(c => c.statuses.includes(newStatus));

    if (destinationColumn?.requiresUpload) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId);
        if(orderIndex !== -1) {
            orders.value[orderIndex].status = fromStatus;
        }

        pendingMove.value = { order, newStatus };
        uploadModalTitle.value = `Anexar Arte para "${destinationColumn.title}"`;
        selectedOrder.value = order;
        showUploadModal.value = true;
    } else {
        await updateOrderStatus(order.id, newStatus, order);
    }
};

const handleUploadSuccess = async (fileUrl: string) => {
    if (!pendingMove.value) return;
    const { order, newStatus } = pendingMove.value;

    const success = await updateOrderStatus(order.id, newStatus, order, fileUrl);

    if (success) {
      const orderIndex = orders.value.findIndex(o => o.id === order.id);
      if(orderIndex !== -1) {
          orders.value[orderIndex].status = newStatus;
      }
    }

    showUploadModal.value = false;
    pendingMove.value = null;
    selectedOrder.value = null;
};

const cancelMove = () => {
    showUploadModal.value = false;
    pendingMove.value = null;
    selectedOrder.value = null;
};

const updateOrderStatus = async (orderId: string, newStatus: DesignStatus, order: Order, fileUrl?: string): Promise<boolean> => {
  try {
    if (!userStore.profile) {
      console.error('Perfil do usuário não disponível para atualizar o status.');
      return false;
    }

    let updateData: any = { status: newStatus, designer_id: userStore.profile.id };
    if (fileUrl) {
        updateData.details = { ...order.details, final_art_url: fileUrl };
    }

    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
    if (error) {
        console.error("Erro ao atualizar status do pedido no DB:", error);
        throw error;
    }

    const orderIndex = orders.value.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        orders.value[orderIndex].status = newStatus;
        if (fileUrl && orders.value[orderIndex].details) {
            orders.value[orderIndex].details.final_art_url = fileUrl;
        }
    }

    if (newStatus === 'customer_approval') {
        await notifyStakeholders(order, fileUrl);
    }
    return true;
  } catch (err) {
    console.error('Erro ao atualizar status do pedido:', err);
    return false;
  }
};

const notifyStakeholders = async (order: Order, fileUrl?: string) => {
    if (!userStore.profile) return;
    let content = `A arte para o pedido de "${order.customer_name}" está pronta para aprovação.`;
    if(fileUrl) content += ` Uma nova versão do arquivo foi anexada.`

    await supabase.from('notifications').insert({
        recipient_id: order.created_by,
        sender_id: userStore.profile.id,
        content: content,
        redirect_url: `/pedidos/${order.id}/aprovar`
    });
};

const fetchOrdersForDesign = async () => {
  loading.value = true;
  try {
    const relevantStatuses = columns.value.flatMap(c => c.statuses);
    const { data, error } = await supabase.from('orders').select('id, customer_name, quantity_meters, status, created_by, details').in('status', relevantStatuses);
    if (error) throw error;
    orders.value = data as Order[];
  } catch (err) {
    console.error('Erro ao buscar pedidos para design:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchSession();
  }
  fetchOrdersForDesign();
});
</script>

<style scoped lang="scss">
// Adicionado um container para controlar a rolagem
.kanban-board-container {
  width: 100%;
  overflow-x: auto; // A rolagem acontece aqui
  padding-bottom: 16px; // Espaço para a barra de rolagem não colar no fundo
}

.kanban-board {
  display: flex;
  gap: 16px;
  // min-width é importante para que o flexbox não esprema o conteúdo
  min-width: fit-content;
}
.kanban-column {
  width: 300px; // Largura padrão para desktop
  min-width: 300px; // Não permite que a coluna fique menor que isso
  background-color: rgba(25, 25, 30, 0.5);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px); // Limita a altura para caber na tela
}
.column-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  flex-shrink: 0; // Impede que o header encolha
  .column-title { font-size: 1rem; font-weight: bold; }
}
.column-content {
  padding: 16px;
  flex-grow: 1;
  min-height: 200px;
  overflow-y: auto; // Rolagem vertical para colunas com muitos cards
}
.order-card {
  cursor: grab;
  background-color: rgba(45, 45, 55, 0.8);
  transition: all 0.2s ease-in-out;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  }
}
.empty-column { padding: 2rem; }

// Media query para telas mobile
@media (max-width: 600px) {
    .kanban-column {
        width: 80vw; // Coluna ocupa 80% da largura da tela
        min-width: 80vw;
    }

    // Diminui um pouco o padding dos cards no mobile
    .order-card .v-card-text {
        padding: 12px;
    }
}

</style>
