<template>
  <v-dialog :model-value="show" max-width="800px" persistent scrollable>
    <v-card class="glassmorphism-card-dialog">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Faturar Pedido #{{ String(order?.order_number).padStart(4, '0') }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <v-card-text v-if="order">
        <p class="mb-4">
          Ajuste as metragens finais produzidas para cada item do cliente <strong>{{ order.customer_name }}</strong>. Estes serão os valores utilizados para a fatura final.
        </p>

        <div v-if="editableItems.length > 0">
          <v-table class="bg-transparent">
            <thead>
              <tr>
                <th class="text-left">Estampa (Ref.)</th>
                <th class="text-left">Produto (Base)</th>
                <th class="text-center">Qtd. Pedida</th>
                <th class="text-center" style="width: 150px;">Qtd. Faturada</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in editableItems" :key="item.id">
                <td>{{ item.stamp_ref }}</td>
                <td>{{ item.fabric_type }}</td>
                <td class="text-center">{{ item.quantity_meters }}m</td>
                <td>
                  <v-text-field
                    v-model.number="item.billed_quantity"
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    suffix="m"
                  ></v-text-field>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <div v-else class="text-center text-grey pa-8">
            <v-icon size="48">mdi-alert-circle-outline</v-icon>
            <p class="mt-2">Nenhum item encontrado para este pedido.</p>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-footer pa-4">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('close')">Cancelar</v-btn>
        <v-btn
          color="success"
          variant="flat"
          @click="saveBilling"
          :loading="isSaving"
          :disabled="editableItems.length === 0"
        >
          <v-icon start>mdi-check-all</v-icon>
          Confirmar Faturamento
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { supabase } from '@/api/supabase';
import type { Order, OrderItem } from '@/types';

const props = defineProps<{
  show: boolean;
  order: Order | null;
}>();

const emit = defineEmits(['close', 'billed']);

const isSaving = ref(false);
const editableItems = ref<Partial<OrderItem>[]>([]);

watch(() => props.order, (newOrder) => {
  if (newOrder && newOrder.order_items) {
    // Cria uma cópia editável dos itens para o formulário
    editableItems.value = newOrder.order_items.map(item => ({
      ...item,
      // Preenche o valor a faturar com o valor original se ainda não tiver sido faturado
      billed_quantity: item.billed_quantity ?? item.quantity_meters
    }));
  } else {
    editableItems.value = [];
  }
}, { immediate: true, deep: true });

const saveBilling = async () => {
  if (!props.order) return;
  isSaving.value = true;
  try {
    const updates = editableItems.value.map(item =>
      supabase
        .from('order_items')
        .update({ billed_quantity: item.billed_quantity })
        .eq('id', item.id)
    );

    await Promise.all(updates);

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({ billed_at: new Date().toISOString() })
      .eq('id', props.order.id);

    if (orderUpdateError) throw orderUpdateError;

    emit('billed');
  } catch (error: any) {
    console.error('Erro ao faturar o pedido:', error);
    // Adicionar um snackbar de erro
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
