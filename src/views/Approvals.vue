<template>
  <v-container fluid class="pa-md-6 pa-2 fill-height">
    <div class="approvals-container">
      <v-toolbar color="transparent" class="mb-4 px-0">
        <v-toolbar-title class="font-weight-bold text-h5 d-flex align-center">
          <v-icon start size="36">mdi-check-decagram-outline</v-icon>
          Pedidos para Aprovação
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field
          v-model="searchQuery"
          variant="solo-filled"
          flat
          density="compact"
          label="Buscar por cliente..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          class="search-field"
        ></v-text-field>
      </v-toolbar>

      <div v-if="loading" class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <div v-else-if="filteredOrders.length === 0" class="empty-state">
        <v-icon size="80" class="mb-4 text-medium-emphasis">mdi-emoticon-cool-outline</v-icon>
        <p class="text-h6 text-medium-emphasis">Tudo em ordem por aqui!</p>
        <p class="text-body-1 text-grey">Nenhum pedido aguardando sua aprovação no momento.</p>
      </div>

      <v-row v-else>
        <v-col v-for="order in filteredOrders" :key="order.id" cols="12" sm="6" md="4" lg="3">
          <v-card class="approval-card" variant="flat">
            <v-img
              :src="getArtPreview(order)"
              height="220"
              class="art-preview"
              cover
            >
              <div class="art-overlay d-flex align-end pa-3">
                <h3 class="font-weight-bold text-shadow">{{ order.customer_name }}</h3>
              </div>
            </v-img>

            <v-card-text class="pb-1">
                <div class="info-line">
                    <v-icon size="small" class="mr-2 icon-color">mdi-alert-circle-outline</v-icon>
                    <span>{{ getPendingItemsCount(order) }} item(s) para aprovar</span>
                </div>
                <div class="info-line">
                    <v-icon size="small" class="mr-2 icon-color">mdi-account-edit-outline</v-icon>
                    <span>Arte por: {{ getDesignerName(order) }}</span>
                </div>
            </v-card-text>

            <v-card-actions class="pa-3">
              <v-btn
                :to="{ name: 'ApproveOrder', params: { id: order.id } }"
                color="green-lighten-1"
                variant="tonal"
                block
                class="action-btn"
              >
                Analisar e Decidir
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { onActivated } from 'vue';

type OrderItem = {
    id: string;
    status: string;
    stamp_image_url?: string;
    [key: string]: any;
};

type Order = {
  id: string;
  customer_name: string;
  created_at: string;
  order_items: OrderItem[];
  designer: { full_name: string } | null;
};

const userStore = useUserStore();
const orders = ref<Order[]>([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredOrders = computed(() => {
    if(!searchQuery.value) return orders.value;
    const query = searchQuery.value.toLowerCase();
    return orders.value.filter(order =>
        order.customer_name.toLowerCase().includes(query)
    );
});

const fetchPendingOrders = async () => {
  if (!userStore.profile) return;
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, created_at, designer:designer_id(full_name), order_items(*)')
      .eq('is_launch', true)
      .eq('order_items.status', 'customer_approval')
      .order('created_at', { ascending: true });

    if (error) throw error;
    // Garante que apenas pedidos com itens pendentes sejam mostrados.
    orders.value = (data as Order[]).filter(o => o.order_items && o.order_items.length > 0) || [];
  } catch (e) {
    console.error('Erro ao buscar pedidos para aprovação:', e);
  } finally {
    loading.value = false;
  }
};

const getArtPreview = (order: Order): string => {
    const pendingItem = order.order_items.find(item => item.status === 'customer_approval');
    if (pendingItem && pendingItem.stamp_image_url) {
        return pendingItem.stamp_image_url;
    }
    return `https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/placeholder-art.png`;
}

const getPendingItemsCount = (order: Order): number => {
    return order.order_items.filter(item => item.status === 'customer_approval').length;
}

const getDesignerName = (order: Order): string => {
    return order.designer?.full_name || 'N/A';
}

// *** CORREÇÃO APLICADA AQUI ***
// onActivated é um hook do Vue Router que é chamado toda vez que a página se torna ativa.
// Isso garante que a lista seja sempre atualizada ao navegar para esta tela.
onActivated(() => {
    if (userStore.isLoggedIn) {
        fetchPendingOrders();
    }
})

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchPendingOrders();
  }
});
</script>

<style scoped lang="scss">
.approvals-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
.search-field { max-width: 320px; }
.approval-card {
  border-radius: 16px; background-color: rgba(30, 30, 35, 0.7);
  backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
    border-color: rgba(var(--v-theme-primary), 0.4);
  }
}
.art-preview { position: relative; }
.art-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 10%, rgba(0,0,0,0) 60%); }
.text-shadow { text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.info-line { display: flex; align-items: center; padding: 4px 0; font-size: 0.9rem; color: #E0E0E0; .icon-color { color: rgba(var(--v-theme-primary-rgb), 0.8); } }
.action-btn { transition: background-color 0.2s ease-in-out; }
.empty-state { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; flex-grow: 1; color: #757575; }
</style>
