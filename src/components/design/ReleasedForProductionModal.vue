<template>
  <v-dialog :model-value="show" max-width="1200px" persistent @update:model-value="$emit('close')">
    <v-card class="glassmorphism-card-dialog">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Itens Liberados para Produção</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="$emit('close')"></v-btn>
      </v-toolbar>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="releasedItems"
          class="bg-transparent"
          density="compact"
          :loading="loading"
          no-data-text="Nenhum item liberado recentemente."
        >
          <template v-slot:item.customer_name="{ item }">
            <span class="font-weight-bold">{{ item.order.customer_name }}</span>
          </template>
          <template v-slot:item.quantity_meters="{ item }">
            {{ item.quantity_meters }}m
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn
              color="info"
              variant="tonal"
              size="small"
              @click="$emit('generate-op', item)"
              :disabled="!item.is_op_generated"
            >
              <v-icon start>mdi-file-pdf-box</v-icon>
              Gerar OP
            </v-btn>
             <v-tooltip activator="parent" location="top">
                {{ item.is_op_generated ? 'Gerar Ordem de Produção' : 'Aguardando agendamento da produção para gerar OP' }}
             </v-tooltip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  releasedItems: any[];
  loading: boolean;
}>();
defineEmits(['close', 'generate-op']);

const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Estampa (Ref.)', key: 'stamp_ref' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' },
];
</script>

<style scoped>
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
</style>
