<template>
  <v-container fluid>
    <v-toolbar color="transparent" class="mb-4">
      <v-toolbar-title class="font-weight-bold">
        <v-icon start>mdi-factory</v-icon>
        Kanban de Produção
      </v-toolbar-title>
    </v-toolbar>

    <div class="kanban-board-production">
      <div v-for="column in productionColumns" :key="column.id" class="kanban-column-production">
        <div class="column-header-production">
          <v-icon :color="column.color" class="mr-2">{{ column.icon }}</v-icon>
          <h3 class="column-title">{{ column.title }}</h3>
          <v-spacer></v-spacer>
          <v-chip size="small" variant="tonal">{{ getColumnOrders(column.statuses).length }}</v-chip>
        </div>

        <draggable
          :list="orders"
          group="productionOrders"
          item-key="id"
          class="column-content-production"
          :data-status="column.statuses[0]"
          @end="onDragEnd"
        >
          <template #item="{ element: order }">
            <v-card
              v-if="column.statuses.includes(order.status)"
              class="order-card-production mb-3"
              elevation="2"
              @click="openDetailModal(order.id)"
            >
              <v-card-text>
                <div class="d-flex justify-space-between align-center mb-2">
                   <p class="font-weight-bold text-body-1">{{ order.customer_name }}</p>
                   <v-chip size="x-small" :color="getStatusColor(order.status)" variant="flat">{{ statusDisplayMap[order.status] }}</v-chip>
                </div>
                <p class="text-body-2">
                  <strong>Tecido:</strong> {{ order.details.fabric_type }}
                </p>
                <p class="text-body-2">
                  <strong>Metragem:</strong> {{ order.quantity_meters }}m
                </p>
                <div v-if="order.details.final_art_url">
                    <v-divider class="my-2"></v-divider>
                     <v-btn
                        :href="order.details.final_art_url"
                        target="_blank"
                        size="small"
                        variant="tonal"
                        color="cyan"
                        prepend-icon="mdi-image-search-outline"
                        @click.stop
                     >
                        Ver Arte Final
                     </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </template>
        </draggable>

        <div v-if="getColumnOrders(column.statuses).length === 0 && !loading" class="empty-column-production text-center text-grey">
          Nenhum pedido nesta etapa.
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Carregando quadro de produção...</p>
    </div>

    <OrderDetailModal
        :show="showDetailModal"
        :order-id="selectedOrderId"
        @close="showDetailModal = false"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import draggable from 'vuedraggable';
import OrderDetailModal from '@/components/OrderDetailModal.vue'; // NOVO

// ---- TIPAGEM ----
type ProductionStatus = 'production_queue' | 'in_printing' | 'in_cutting' | 'completed';

type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  status: ProductionStatus;
  details: {
    fabric_type: string;
    final_art_url?: string;
  };
};

type KanbanColumn = {
  id: number;
  title: string;
  icon: string;
  color: string;
  statuses: ProductionStatus[];
};

// ---- ESTADO ----
const orders = ref<Order[]>([]);
const loading = ref(true);
const showDetailModal = ref(false); // NOVO
const selectedOrderId = ref<string | null>(null); // NOVO

const productionColumns = ref<KanbanColumn[]>([
  { id: 1, title: 'Fila de Produção', icon: 'mdi-format-list-bulleted-square', color: 'grey', statuses: ['production_queue'] },
  { id: 2, title: 'Em Impressão', icon: 'mdi-printer', color: 'blue', statuses: ['in_printing'] },
  { id: 3, title: 'Corte e Acabamento', icon: 'mdi-content-cut', color: 'orange', statuses: ['in_cutting'] },
  { id: 4, title: 'Pronto para Envio', icon: 'mdi-package-variant-closed-check', color: 'green', statuses: ['completed'] },
]);

const statusDisplayMap: Record<ProductionStatus, string> = {
    production_queue: 'Na Fila',
    in_printing: 'Impressão',
    in_cutting: 'Corte',
    completed: 'Finalizado'
};

// ---- FUNÇÕES ----

// NOVO: Função para abrir o modal
const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};

const getColumnOrders = (statuses: ProductionStatus[]) => {
  return orders.value.filter(order => statuses.includes(order.status));
};

const onDragEnd = async (event: any) => {
    const { item, to } = event;
    const orderId = item._underlying_vm_.id;
    const newStatus = to.getAttribute('data-status');

    if (orderId && newStatus) {
        const order = orders.value.find(o => o.id === orderId);
        if (order && order.status !== newStatus) {
            await updateOrderStatus(orderId, newStatus as ProductionStatus);
        }
    }
};

const getStatusColor = (status: ProductionStatus) => {
  return productionColumns.value.find(c => c.statuses.includes(status))?.color || 'grey';
};

const fetchProductionOrders = async () => {
  loading.value = true;
  try {
    const relevantStatuses = productionColumns.value.flatMap(c => c.statuses);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', relevantStatuses);

    if (error) throw error;
    orders.value = data || [];
  } catch (err) {
    console.error('Erro ao buscar pedidos de produção:', err);
  } finally {
    loading.value = false;
  }
};

const updateOrderStatus = async (orderId: string, newStatus: ProductionStatus) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;
    const orderIndex = orders.value.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders.value[orderIndex].status = newStatus;
    }
  } catch (err) {
    console.error('Erro ao atualizar status do pedido:', err);
  }
};

onMounted(() => {
  fetchProductionOrders();
});
</script>

<style scoped lang="scss">
/* Estilos não alterados */
.kanban-board-production {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}
.kanban-column-production {
  min-width: 340px;
  width: 340px;
  background-color: rgba(25, 25, 30, 0.5);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}
.column-header-production {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  .column-title {
    font-size: 1.1rem;
    font-weight: bold;
  }
}
.column-content-production {
  padding: 16px;
  flex-grow: 1;
  min-height: 400px;
  overflow-y: auto;
}
.order-card-production {
  background-color: rgba(50, 50, 60, 0.9);
  cursor: pointer;
  &:active {
    cursor: grabbing;
  }
}
.empty-column-production {
  padding: 2rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
