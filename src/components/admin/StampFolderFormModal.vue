<template>
  <v-dialog :model-value="show" max-width="500px" persistent @update:model-value="$emit('close')">
    <v-card class="glassmorphism-card-dialog">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">{{ isEditing ? 'Editar Pasta' : 'Criar Nova Pasta' }}</v-toolbar-title>
      </v-toolbar>
      <v-card-text class="py-4">
        <v-text-field
          v-model="form.name"
          label="Nome da Pasta"
          variant="outlined"
          autofocus
          @keyup.enter="saveFolder"
        ></v-text-field>
      </v-card-text>
      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('close')">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" @click="saveFolder" :loading="isSaving">Salvar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue';
import { supabase } from '@/api/supabase';

const props = defineProps({ show: Boolean, folderData: Object as () => { id: number; name: string } | null });
const emit = defineEmits(['close', 'save']);

const isSaving = ref(false);
const form = reactive({ id: null as number | null, name: '' });
const isEditing = computed(() => !!form.id);

watch(() => props.show, (newVal) => {
    if (newVal) {
        if (props.folderData) {
            form.id = props.folderData.id;
            form.name = props.folderData.name;
        } else {
            form.id = null;
            form.name = '';
        }
    }
});

const saveFolder = async () => {
    if (!form.name.trim()) return;
    isSaving.value = true;
    const payload = { name: form.name };
    try {
        if (form.id) {
            const { error } = await supabase.from('stamp_folders').update(payload).eq('id', form.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('stamp_folders').insert(payload);
            if (error) throw error;
        }
        emit('save');
    } catch (err) {
        console.error("Erro ao salvar pasta:", err);
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
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
</style>
