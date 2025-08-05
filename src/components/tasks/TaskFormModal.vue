<template>
  <v-dialog :model-value="show" @update:model-value="closeModal" max-width="700px" persistent>
    <v-card class="glassmorphism-card-dialog">
      <v-toolbar color="transparent" density="compact">
          <v-toolbar-title class="font-weight-bold">{{ isEditing ? 'Editar Tarefa' : 'Criar Nova Tarefa' }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" @click="closeModal"></v-btn>
      </v-toolbar>
      <v-card-text class="py-4">
        <v-text-field
          v-model="form.title"
          label="Título da Tarefa"
          variant="outlined"
          autofocus
          class="mb-4"
        ></v-text-field>
        <v-textarea
          v-model="form.description"
          label="Descrição (opcional)"
          variant="outlined"
          rows="3"
          class="mb-4"
        ></v-textarea>
        <v-row>
            <v-col cols="12" sm="6">
                <v-autocomplete
                    v-model="form.user_id"
                    :items="users"
                    item-title="full_name"
                    item-value="id"
                    label="Atribuir para"
                    variant="outlined"
                >
                    <template v-slot:item="{ props, item }">
                        <v-list-item v-bind="props" :prepend-avatar="item.raw.avatar_url" :title="item.raw.full_name"></v-list-item>
                    </template>
                </v-autocomplete>
            </v-col>
            <v-col cols="12" sm="6">
                <v-text-field
                    v-model="form.due_date"
                    label="Data de Entrega"
                    type="date"
                    variant="outlined"
                ></v-text-field>
            </v-col>
        </v-row>
        <v-select
            v-model="form.priority"
            :items="['Baixa', 'Média', 'Alta']"
            label="Prioridade"
            variant="outlined"
            class="mb-4"
        ></v-select>
        <v-switch
            v-model="notifyUser"
            label="Notificar usuário sobre esta tarefa"
            color="primary"
            inset
        ></v-switch>
      </v-card-text>
      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="saveTask"
          :loading="isSaving"
          :disabled="!form.title"
        >
          Salvar Tarefa
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  show: Boolean,
  taskData: Object,
  users: Array,
});
const emit = defineEmits(['close', 'save']);

const userStore = useUserStore();
const isSaving = ref(false);
const notifyUser = ref(true);
const form = reactive({
  id: null,
  title: '',
  description: '',
  user_id: null,
  due_date: null,
  priority: 'Média',
  status: 'Pendente',
  is_completed: false,
});

const isEditing = computed(() => !!form.id);

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.taskData) {
      Object.assign(form, { ...props.taskData });
    } else {
      resetForm();
      form.user_id = userStore.profile?.id; // Atribui a si mesmo por padrão
    }
  }
});

const resetForm = () => {
    Object.assign(form, {
        id: null, title: '', description: '', user_id: null, due_date: null,
        priority: 'Média', status: 'Pendente', is_completed: false
    });
}

const saveTask = async () => {
  if (!form.title || !form.user_id) return;
  isSaving.value = true;

  try {
    const taskPayload = {
      title: form.title,
      description: form.description,
      user_id: form.user_id,
      due_date: form.due_date,
      priority: form.priority,
      status: form.status,
      is_completed: form.is_completed,
      created_by: form.id ? undefined : userStore.profile?.id, // Só insere created_by em tarefas novas
    };

    let savedData;
    if (form.id) {
      const { data, error } = await supabase.from('tasks').update(taskPayload).eq('id', form.id).select('*, profiles:user_id(*)').single();
      if (error) throw error;
      savedData = data;
    } else {
      const { data, error } = await supabase.from('tasks').insert(taskPayload).select('*, profiles:user_id(*)').single();
      if (error) throw error;
      savedData = data;
    }

    if (notifyUser.value && userStore.profile?.id !== form.user_id) {
      await supabase.from('notifications').insert({
        recipient_id: form.user_id,
        sender_id: userStore.profile?.id,
        content: `Nova tarefa atribuída a você: "${form.title}"`,
        redirect_url: '/tasks',
      });
    }

    emit('save', savedData);
  } catch (error) {
    console.error("Erro ao salvar tarefa:", error);
  } finally {
    isSaving.value = false;
  }
};

const closeModal = () => {
  emit('close');
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
