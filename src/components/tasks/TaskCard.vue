<template>
    <v-card
        class="task-card mb-3"
        elevation="2"
        :data-id="task.id"
        @click="$emit('edit', task)"
    >
        <v-card-text>
        <div class="d-flex justify-space-between align-center mb-2">
            <p class="font-weight-bold text-body-1">{{ task.title }}</p>
            <v-chip :color="priorityChip.color" size="x-small" variant="flat">{{ task.priority }}</v-chip>
        </div>
        <p class="text-body-2 text-medium-emphasis text-truncate">
            {{ task.description || 'Nenhuma descrição.' }}
        </p>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-2">
            <v-chip v-if="task.due_date" :color="dueDateChip.color" size="small" variant="tonal">
                <v-icon start size="small">{{ dueDateChip.icon }}</v-icon>
                {{ dueDateChip.text }}
            </v-chip>
            <v-spacer></v-spacer>
            <v-avatar size="24" v-if="task.profiles">
                 <v-tooltip activator="parent" location="top">
                    Responsável: {{ task.profiles.full_name }}
                </v-tooltip>
                <v-img :src="task.profiles.avatar_url"></v-img>
            </v-avatar>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
});

const priorityChip = computed(() => {
    switch (props.task.priority) {
        case 'Alta': return { color: 'error' };
        case 'Média': return { color: 'warning' };
        case 'Baixa': return { color: 'info' };
        default: return { color: 'grey' };
    }
});

const dueDateChip = computed(() => {
    if (!props.task.due_date) return null;
    const dueDate = new Date(props.task.due_date);
    const today = startOfDay(new Date());

    if (isPast(dueDate) && !isToday(dueDate)) return { text: 'Atrasado', color: 'error', icon: 'mdi-alert-circle-outline' };
    if (isToday(dueDate)) return { text: 'Hoje', color: 'warning', icon: 'mdi-alarm-check' };
    if (isTomorrow(dueDate)) return { text: 'Amanhã', color: 'primary', icon: 'mdi-weather-sunset' };
    return { text: format(dueDate, 'dd/MM', { locale: ptBR }), color: 'default', icon: 'mdi-calendar-blank-outline' };
});
</script>

<style scoped lang="scss">
.task-card {
  cursor: grab;
  background-color: rgba(50, 50, 60, 0.9);
  transition: all 0.2s ease-in-out;
  border-left: 4px solid transparent;
  border-left-color: v-bind('priorityChip.color');

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  }
  &:active {
    cursor: grabbing;
  }
}
</style>
