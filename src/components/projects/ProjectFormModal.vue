<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="600px" persistent>
    <v-card class="glassmorphism-card-dialog">
      <v-toolbar color="transparent" density="compact">
          <v-toolbar-title class="font-weight-bold">{{ isEditing ? 'Editar Projeto' : 'Criar Novo Projeto' }}</v-toolbar-title>
      </v-toolbar>
      <v-card-text class="py-4">
        <v-text-field v-model="form.name" label="Nome do Projeto" variant="outlined" autofocus></v-text-field>
        <v-textarea v-model="form.description" label="Descrição (Opcional)" variant="outlined" rows="3"></v-textarea>
      </v-card-text>
      <v-card-actions class="dialog-footer">
        <v-btn v-if="isEditing" color="error" @click="deleteProject">Excluir</v-btn>
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('close')">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" @click="saveProject" :loading="isSaving">Salvar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

const props = defineProps({ show: Boolean, projectData: Object });
const emit = defineEmits(['close', 'save']);
const userStore = useUserStore();

const isSaving = ref(false);
const form = reactive({ id: null, name: '', description: '' });
const isEditing = computed(() => !!form.id);

watch(() => props.projectData, (newVal) => {
    if (newVal) Object.assign(form, newVal);
    else { form.id = null; form.name = ''; form.description = ''; }
});

const saveProject = async () => {
    isSaving.value = true;
    const payload = {
        name: form.name,
        description: form.description,
        user_id: userStore.profile.id
    };
    if (form.id) {
        const { data } = await supabase.from('projects').update(payload).eq('id', form.id).select().single();
        emit('save', data);
    } else {
        const { data } = await supabase.from('projects').insert(payload).select().single();
        // Ao criar, também cria colunas padrão
        await supabase.from('project_columns').insert([
            { project_id: data.id, name: 'A Fazer', position: 0 },
            { project_id: data.id, name: 'Em Andamento', position: 1 },
            { project_id: data.id, name: 'Concluído', position: 2 },
        ]);
        emit('save', data);
    }
    isSaving.value = false;
};

const deleteProject = async () => {
    if (confirm(`Tem certeza que deseja excluir o projeto "${form.name}"? Esta ação não pode ser desfeita.`)) {
        await supabase.from('projects').delete().eq('id', form.id);
        window.location.reload(); // Recarrega a página para atualizar a lista
    }
}
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
