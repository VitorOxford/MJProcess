<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="800px" persistent>
    <v-card class="glassmorphism-card">
      <v-toolbar color="transparent" density="compact">
        <v-toolbar-title class="font-weight-bold">
          Detalhes do Pedido
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      </div>

      <v-alert v-else-if="error" type="error" prominent class="ma-4">
        {{ error }}
      </v-alert>

      <v-card-text v-else-if="order" class="py-4">
        <v-row>
          <v-col cols="12" md="7">
            <v-list density="compact" bg-color="transparent">
              <v-list-item title="Cliente" :subtitle="order.customer_name"></v-list-item>
              <v-list-item title="Status Atual">
                 <template #subtitle>
                    <v-chip size="small" :color="getStatusColor(order.status)" variant="flat">{{ statusDisplayMap[order.status] || order.status }}</v-chip>
                 </template>
              </v-list-item>
              <v-list-item title="Valor do Pedido" :subtitle="`R$ ${order.value.toLocaleString('pt-BR')}`"></v-list-item>
              <v-list-item title="Criado por" :subtitle="order.profiles?.full_name || 'N/A'"></v-list-item>
              <v-list-item title="Loja de Origem" :subtitle="order.stores?.name || 'N/A'"></v-list-item>
              <v-list-item title="Data de Criação" :subtitle="formatDateSafe(order.created_at)"></v-list-item>
              <v-list-item v-if="order.production_date" title="Data de Produção" :subtitle="formatDateSafe(order.production_date)"></v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="5">
             <h4 class="text-subtitle-1 font-weight-bold mb-2">Materiais e Arte</h4>
              <v-list density="compact" bg-color="transparent" lines="two">
                  <v-list-item title="Tecido" :subtitle="order.details.fabric_type"></v-list-item>
                  <v-list-item title="Metragem" :subtitle="`${order.quantity_meters}m`"></v-list-item>
                  <v-list-item v-if="order.details.final_art_url" title="Arte Final">
                      <template #subtitle>
                         <v-btn
                            :href="order.details.final_art_url"
                            target="_blank"
                            size="small"
                            variant="text"
                            color="cyan"
                            class="pa-0"
                            prepend-icon="mdi-open-in-new"
                         >
                            Ver / Baixar
                         </v-btn>
                      </template>
                  </v-list-item>
              </v-list>
          </v-col>
        </v-row>
        <v-divider class="my-4"></v-divider>
         <h4 class="text-subtitle-1 font-weight-bold mb-2">Observações da Estampa</h4>
         <p class="text-body-2 text-medium-emphasis pa-2">
            {{ order.details.stamp_details }}
         </p>
      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('close')">Fechar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---- PROPS E EMITS (sem alteração) ----
const props = defineProps({
  show: Boolean,
  orderId: String,
});
const emit = defineEmits(['close']);

// ---- TIPAGEM (sem alteração) ----
type OrderDetails = {
  id: string;
  customer_name: string;
  status: string;
  value: number;
  created_at: string;
  production_date: string | null;
  quantity_meters: number;
  details: {
    fabric_type: string;
    stamp_details: string;
    final_art_url?: string;
  };
  profiles: { full_name: string; } | null;
  stores: { name: string; } | null;
};

// ---- ESTADO (sem alteração) ----
const order = ref<OrderDetails | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const statusDisplayMap: Record<string, string> = {
    design_pending: 'Aguardando Design',
    in_design: 'Em Design',
    customer_approval: 'Aguardando Aprovação',
    production_queue: 'Na Fila de Produção',
    in_printing: 'Em Impressão',
    in_cutting: 'Corte e Acabamento',
    completed: 'Pronto para Envio'
};

const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey',
    in_design: 'blue',
    customer_approval: 'orange',
    production_queue: 'grey',
    in_printing: 'blue',
    in_cutting: 'orange',
    completed: 'green'
};

// ---- FUNÇÕES ----
const getStatusColor = (status: string) => statusColorMap[status] || 'grey';

// NOVO: Função de formatação segura
const formatDateSafe = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'; // Se a data for nula, retorna 'N/A'
    try {
        // Formata a data com a string de formato correta
        return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return dateString; // Retorna a string original em caso de erro
    }
}

const fetchOrder = async (id: string) => {
  if (!id) return;
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(`*, profiles:created_by (full_name), stores (name)`)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    order.value = data;
  } catch (e: any) {
    error.value = `Erro ao carregar o pedido: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

watch(() => props.orderId, (newId) => {
  if (newId && props.show) {
    fetchOrder(newId);
  } else {
    order.value = null;
  }
});

</script>

<style scoped lang="scss">
.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.dialog-header, .dialog-footer {
  border-color: rgba(255, 255, 255, 0.1) !important;
}
</style>
