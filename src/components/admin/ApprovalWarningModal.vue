<template>
  <v-dialog :model-value="show" max-width="800px" persistent @update:model-value="$emit('close')">
    <v-card class="glassmorphism-card-dialog">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Aprovações Pendentes</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="pendingOrders"
          class="bg-transparent"
          density="compact"
          :loading="loading"
        >
          <template v-slot:item.customer_name="{ item }">
            <span class="font-weight-bold">{{ item.customer_name }}</span>
          </template>

          <template v-slot:item.created_by="{ item }">
            {{ item.profiles?.full_name || 'N/A' }}
          </template>

          <template v-slot:item.quantity_meters="{ item }">
            <v-chip color="orange" variant="tonal" size="small">{{ item.quantity_meters }}m</v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-tooltip text="Notificar Vendedor" location="top">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-alert-outline"
                  variant="text"
                  color="warning"
                  @click="sendWarningNotification(item)"
                  :loading="notifying[item.id]"
                ></v-btn>
              </template>
            </v-tooltip>
          </template>
        </v-data-table>
      </v-card-text>

       <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
          {{ snackbar.text }}
        </v-snackbar>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import type { Order } from '@/stores/dashboard';

defineProps<{
  show: boolean;
  pendingOrders: Order[];
}>();
defineEmits(['close']);

const userStore = useUserStore();
const loading = ref(false);
const notifying = ref<Record<string, boolean>>({});
const snackbar = reactive({ show: false, text: '', color: '' });

// **CABEÇALHOS DA TABELA ATUALIZADOS**
const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Lançado Por', key: 'created_by' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' },
];

const sendWarningNotification = async (order: Order) => {
  if (!order.created_by || !userStore.profile?.id) {
    showSnackbar('Não foi possível identificar o criador do pedido.', 'error');
    return;
  }
  notifying.value[order.id] = true;
  try {
    const alertTitle = 'AVISO: APROVAÇÃO PENDENTE!';
    const alertMessage = `Aprovação pendente para o pedido de "${order.customer_name}". Favor revisar!`;
    const alertContent = `[ALERT_PENDING_APPROVAL]${alertTitle}::${alertMessage}`;

    const { error } = await supabase.from('notifications').insert({
      recipient_id: order.created_by,
      sender_id: userStore.profile.id,
      content: alertContent,
      redirect_url: `/pedidos/${order.id}/aprovar`
    });
    if (error) throw error;
    showSnackbar('Notificação de alerta enviada com sucesso!', 'success');
  } catch (err: any) {
    console.error("Erro ao enviar notificação de alerta:", err);
    showSnackbar(`Erro: ${err.message}`, 'error');
  } finally {
    notifying.value[order.id] = false;
  }
};

const showSnackbar = (text: string, color: string) => {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
};
</script>

<style scoped>
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
</style>
