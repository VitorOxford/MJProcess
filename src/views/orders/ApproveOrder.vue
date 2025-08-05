<template>
  <v-container>
    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Carregando dados do pedido...</p>
    </div>

    <v-alert v-else-if="error" type="error" class="mx-auto" max-width="800" prominent>
      {{ error }}
    </v-alert>

    <v-card v-else-if="order" class="glassmorphism-card-approve mx-auto" max-width="800">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">
          <v-icon start>mdi-check-decagram-outline</v-icon>
          Aprovação de Arte Final
        </v-toolbar-title>
      </v-toolbar>

      <v-card-text class="pa-5">
        <v-row>
          <v-col cols="12" md="6">
            <h3 class="text-h6">Pedido de: {{ order.customer_name }}</h3>
            <v-list density="compact" bg-color="transparent">
              <v-list-item title="Tecido" :subtitle="order.details.fabric_type"></v-list-item>
              <v-list-item title="Metragem" :subtitle="`${order.quantity_meters}m`"></v-list-item>
              <v-list-item title="Valor" :subtitle="`R$ ${order.value.toLocaleString('pt-BR')}`"></v-list-item>
              <v-list-item title="Status Atual">
                 <template v-slot:subtitle>
                    <v-chip size="small" variant="flat" color="orange">Aguardando Aprovação</v-chip>
                 </template>
              </v-list-item>
            </v-list>
          </v-col>

          <v-col cols="12" md="6">
             <h3 class="text-h6">Arte para Aprovação:</h3>
             <v-card class="mt-2" variant="tonal">
                <v-img
                    v-if="isImage(order.details.final_art_url)"
                    :src="order.details.final_art_url"
                    height="250"
                    cover
                ></v-img>
                 <div v-else class="d-flex flex-column align-center justify-center pa-8" style="height: 250px;">
                    <v-icon size="64">mdi-file-document-outline</v-icon>
                    <p class="mt-2">Arquivo de arte</p>
                 </div>
                 <v-card-actions>
                    <v-btn
                        :href="order.details.final_art_url"
                        target="_blank"
                        block
                        variant="text"
                        color="cyan"
                    >
                        Ver / Baixar Arte Completa
                    </v-btn>
                 </v-card-actions>
             </v-card>
          </v-col>
        </v-row>

        <v-divider class="my-6"></v-divider>

        <div class="d-flex flex-wrap justify-center ga-4">
            <v-btn
                @click="showRequestChangesModal = true"
                color="orange"
                variant="outlined"
                size="large"
                :loading="isSubmitting"
            >
                <v-icon start>mdi-arrow-left</v-icon>
                Solicitar Alteração
            </v-btn>
            <v-btn
                @click="approveOrder"
                color="green"
                variant="flat"
                size="large"
                :loading="isSubmitting"
            >
                 <v-icon start>mdi-check-all</v-icon>
                Aprovar e Encaminhar
            </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <RequestChangesModal
        :show="showRequestChangesModal"
        :order="order"
        @close="showRequestChangesModal = false"
        @submitted="handleChangesSubmitted"
    />

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import RequestChangesModal from '@/components/RequestChangesModal.vue';

type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  value: number;
  status: string;
  designer_id: string;
  details: {
    fabric_type: string;
    final_art_url: string;
  };
};

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const order = ref<Order | null>(null);
const loading = ref(true);
const isSubmitting = ref(false);
const error = ref<string | null>(null);
const showRequestChangesModal = ref(false);
const orderId = route.params.id as string;

const fetchOrderDetails = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (fetchError || !data) throw new Error('Pedido não encontrado.');
    if(data.status !== 'customer_approval') {
        router.push({ name: 'Home' });
        return;
    }
    order.value = data;
  } catch (e: any) { error.value = e.message; }
  finally { loading.value = false; }
};

const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);

const approveOrder = async () => {
    if (!order.value || !userStore.profile) return;
    isSubmitting.value = true;
    try {
        // Chama a nova RPC que contém toda a lógica de aprovação
        const { error: rpcError } = await supabase.rpc('approve_order_and_schedule', {
            p_order_id: order.value.id
        });
        if (rpcError) throw rpcError;

        await supabase.from('order_logs').insert({
            order_id: order.value.id,
            profile_id: userStore.profile.id,
            log_type: 'STATUS_CHANGE',
            description: 'Arte aprovada pelo cliente. Pedido encaminhado para a próxima etapa.'
        });

        await supabase.from('notifications').insert({
            sender_id: userStore.profile.id,
            content: `Pedido de "${order.value.customer_name}" foi APROVADO e encaminhado.`,
            redirect_url: '/pedidos'
        });

        router.push({ name: 'Orders' });

    } catch(e: any) {
        alert(`Erro ao aprovar o pedido: ${e.message}`);
    } finally {
        isSubmitting.value = false;
    }
};

const handleChangesSubmitted = () => {
    showRequestChangesModal.value = false;
    router.push({ name: 'Home' });
};

onMounted(() => {
  fetchOrderDetails();
});
</script>

<style scoped lang="scss">
.glassmorphism-card-approve {
  backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
</style>
