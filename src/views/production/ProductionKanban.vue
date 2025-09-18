<template>
  <v-container fluid>
    <v-toolbar color="transparent" class="mb-4">
      <v-toolbar-title class="font-weight-bold">
        <v-icon start>mdi-factory</v-icon>
        Fila de Produção
      </v-toolbar-title>
    </v-toolbar>

    <v-card class="mb-6 kpi-card" color="rgba(30,30,35,0.8)">
      <v-card-text>
        <div class="d-flex align-center">
          <v-icon size="large" color="primary" class="mr-4">mdi-ruler-square-compass</v-icon>
          <div>
            <div class="text-h4 font-weight-bold">{{ totalMetersInProduction.toLocaleString('pt-BR') }}m</div>
            <div class="text-subtitle-1 text-grey-lighten-1">Total de Metros na Fila de Produção</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
      <v-data-table
        :headers="headers"
        :items="productionOrders"
        :loading="loading"
        class="bg-transparent"
        item-value="id"
        density="comfortable"
        @click:row="(_, { item }) => openDetailModal(item.id)"
        hover
      >
        <template v-slot:item.customer_name="{ item }">
          <span class="font-weight-bold">{{ item.customer_name }}</span>
        </template>

        <template v-slot:item.quantity_meters="{ item }">
          <v-chip color="blue" variant="tonal">{{ item.quantity_meters }}m</v-chip>
        </template>

        <template v-slot:item.details.final_art_url="{ item }">
          <v-btn
            v-if="item.details.final_art_url"
            :href="item.details.final_art_url"
            target="_blank"
            size="small"
            variant="text"
            color="cyan"
            prepend-icon="mdi-image-search-outline"
            @click.stop
          >
            Ver Arte
          </v-btn>
          <span v-else class="text-caption text-grey">Sem arte</span>
        </template>

        <template v-slot:loading>
          <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
        </template>

        <template v-slot:no-data>
          <div class="py-12 text-center text-grey">
            <v-icon size="48" class="mb-2">mdi-package-variant-closed</v-icon>
            <p>Nenhum pedido na fila de produção no momento.</p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <OrderDetailModal
      :show="showDetailModal"
      :order-id="selectedOrderId"
      @close="showDetailModal = false"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import OrderDetailModal from '@/components/OrderDetailModal.vue';

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

// ---- ESTADO ----
const orders = ref<Order[]>([]);
const loading = ref(true);
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);


// Definição dos cabeçalhos para a VDataTable (SEM STATUS)


const headers = [
  { title: 'Cliente', key: 'customer_name', width: '30%' },
  { title: 'Tecido', key: 'details.fabric_type' },
  { title: 'Metragem', key: 'quantity_meters', align: 'center' },
  { title: 'Arte Final', key: 'details.final_art_url', align: 'center', sortable: false },
];

// ---- PROPRIEDADES COMPUTADAS ----
const productionOrders = computed(() => {

    // Filtra apenas pelos pedidos que estão na fila de produção


    return orders.value.filter(order => order.status === 'production_queue');
});

const totalMetersInProduction = computed(() => {
    return productionOrders.value.reduce((total, order) => total + order.quantity_meters, 0);
});

// ---- FUNÇÕES ----
const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};

const fetchProductionOrders = async () => {
  loading.value = true;
  try {

    // Busca apenas os pedidos relevantes para esta tela
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, quantity_meters, status, details')
      .eq('status', 'production_queue'); // Pega só o que está na fila


    if (error) throw error;
    orders.value = data || [];
  } catch (err) {
    console.error('Erro ao buscar pedidos de produção:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchProductionOrders();
});
</script>

<style scoped lang="scss">
.kpi-card, .dashboard-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.dashboard-card {
    :deep(tbody tr) {
        cursor: pointer;
    }
}
:deep(.v-data-table__wrapper) {
    background-color: transparent !important;
}
</style>
