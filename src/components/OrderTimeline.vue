<template>
  <v-timeline side="end" align="start" truncate-line="both" density="compact">
    <v-timeline-item
      v-for="(stage, index) in timelineStages"
      :key="stage.name"
      :dot-color="getDotColor(stage, index)"
      :icon="getIcon(stage, index)"
      fill-dot
      size="small"
    >
      <div class="d-flex justify-space-between align-center">
        <div class="font-weight-bold">{{ stage.name }}</div>
        <div class="text-caption text-grey">{{ getStageStatusText(stage, index) }}</div>
      </div>
    </v-timeline-item>
  </v-timeline>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// ---- PROPS ----
const props = defineProps({
  orderStatus: {
    type: String,
    required: true,
  },
});

// ---- LÓGICA DA TIMELINE ----
const timelineStages = [
  { name: 'Pedido Criado', statuses: ['design_pending'] },
  { name: 'Desenvolvimento do Design', statuses: ['in_design', 'changes_requested', 'finalizing'] },
  { name: 'Aprovação do Cliente', statuses: ['customer_approval'] },
  { name: 'Fila de Produção', statuses: ['production_queue'] },
  { name: 'Impressão e Corte', statuses: ['in_printing', 'in_cutting'] },
  { name: 'Finalizado', statuses: ['completed'] },
];

const currentStageIndex = computed(() => {
  return timelineStages.findIndex(stage => stage.statuses.includes(props.orderStatus));
});

const getDotColor = (stage: any, index: number): string => {
  if (currentStageIndex.value === -1 && index === 0) return 'primary'; // Caso especial para o primeiro item
  if (index < currentStageIndex.value) return 'green';
  if (index === currentStageIndex.value) return 'primary';
  return 'grey';
};

const getIcon = (stage: any, index: number): string => {
    if (index < currentStageIndex.value) return 'mdi-check';
    if (index === currentStageIndex.value) return 'mdi-record';
    return 'mdi-circle-outline';
}

const getStageStatusText = (stage: any, index: number): string => {
  if (index < currentStageIndex.value) return 'Concluído';
  if (index === currentStageIndex.value) return 'Em andamento';
  return 'Pendente';
};

</script>
