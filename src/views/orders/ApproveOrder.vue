<template>
  <v-container>
    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>
    <v-alert v-else-if="error" type="error" prominent>{{ error }}</v-alert>

    <v-card v-else-if="order" class="glassmorphism-card-approve mx-auto" max-width="900">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">
          <v-icon start>mdi-check-decagram-outline</v-icon>
          Aprovação de Itens
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-5">
        <h3 class="text-h6 mb-4">Pedido de: {{ order.customer_name }}</h3>
        <p class="text-medium-emphasis mb-6">
          Os seguintes itens foram enviados pelo designer e precisam da sua aprovação para continuar.
        </p>

        <div v-for="item in itemsToApprove" :key="item.id" class="item-approval-card">
          <v-row no-gutters>
            <v-col cols="12" md="5">
              <v-img :src="item.stamp_image_url" height="100%" cover class="rounded-s"></v-img>
            </v-col>
            <v-col cols="12" md="7">
              <div class="pa-4 d-flex flex-column fill-height">
                <h4 class="text-h6 font-weight-bold">{{ item.stamp_ref }}</h4>
                <p class="text-body-2">{{ item.fabric_type }} - {{ Number(item.quantity_meters).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}m</p>
                <v-spacer></v-spacer>
                <div class="mt-4">
                  <div class="d-flex flex-wrap ga-2">
                    <v-btn
                      color="orange"
                      variant="outlined"
                      @click="openRejectModal(item)"
                    >
                      Solicitar Alteração
                    </v-btn>
                    <v-btn
                      color="green"
                      variant="flat"
                      @click="approveItem(item)"
                    >
                      Aprovar Item
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

      </v-card-text>
    </v-card>

    <v-dialog v-model="showRejectModal" max-width="500px" persistent>
      <v-card>
        <v-card-title>Solicitar Alteração para "{{ itemToReject?.stamp_ref }}"</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="rejectionComment"
            label="Descreva a alteração necessária (obrigatório)"
            variant="outlined"
            rows="4"
            autofocus
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showRejectModal = false">Cancelar</v-btn>
          <v-btn
            color="orange"
            variant="flat"
            :disabled="!rejectionComment.trim()"
            @click="rejectItem"
          >
            Enviar Solicitação
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

// --- TYPES ---
type OrderItem = {
  id: string; fabric_type: string; stamp_ref: string; quantity_meters: number;
  stamp_image_url: string; status: string;
};
type Order = {
  id: string; customer_name: string; order_items: OrderItem[];
};

// --- STATE ---
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const order = ref<Order | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const orderId = route.params.id as string;

const showRejectModal = ref(false);
const itemToReject = ref<OrderItem | null>(null);
const rejectionComment = ref('');

// --- COMPUTED ---
const itemsToApprove = computed(() => {
  return order.value?.order_items.filter(item => item.status === 'customer_approval') || [];
});

// --- METHODS ---
const fetchOrderForApproval = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('id, customer_name, order_items(*)')
      .eq('id', orderId)
      .single();

    if (fetchError || !data) throw new Error('Pedido não encontrado ou sem itens para aprovação.');
    order.value = data;

    if (itemsToApprove.value.length === 0) {
      router.push({ name: 'Approvals' });
    }
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const approveItem = async (item: OrderItem) => {
    await processDecision(item, true);
};

const openRejectModal = (item: OrderItem) => {
  itemToReject.value = item;
  rejectionComment.value = '';
  showRejectModal.value = true;
};

const rejectItem = async () => {
  if (!itemToReject.value || !rejectionComment.value.trim()) return;
  await processDecision(itemToReject.value, false, rejectionComment.value.trim());
};

const processDecision = async (item: OrderItem, isApproved: boolean, comment?: string) => {
  loading.value = true;
  try {
    if (isApproved) {
        // RPC para aprovação
        const { error: rpcError } = await supabase.rpc('process_seller_item_decision', {
            p_item_id: item.id,
            p_decision: 'approved_by_seller',
            p_comment: `Arte para "${item.stamp_ref}" aprovada.`,
            p_profile_id: userStore.profile?.id
        });
        if (rpcError) throw rpcError;
    } else {
        // RPC para solicitar alteração
        const { error: rpcError } = await supabase.rpc('request_item_changes', {
            p_item_id: item.id,
            p_comment: comment,
            p_profile_id: userStore.profile?.id
        });
        if (rpcError) throw rpcError;
    }

    // *** NOVA LÓGICA DE NOTIFICAÇÃO ***
    const { error: notifyError } = await supabase.rpc('notify_designers_about_decision', {
        p_item_id: item.id,
        p_sender_id: userStore.profile?.id,
        p_is_approved: isApproved
    });
    if (notifyError) console.error("Erro ao notificar designers:", notifyError);
    // **********************************

    await fetchOrderForApproval();
  } catch(e: any) {
    error.value = `Erro ao processar decisão: ${e.message}`;
  } finally {
    showRejectModal.value = false;
    loading.value = false;
  }
};

onMounted(fetchOrderForApproval);
</script>


<style scoped lang="scss">
.glassmorphism-card-approve {
  backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.item-approval-card {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.rounded-s {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
}
</style>
