<template>
  <v-dialog :model-value="show" max-width="600px" persistent @update:model-value="$emit('close')">
    <v-card class="glassmorphism-card-dialog">
        <v-toolbar color="transparent">
            <v-toolbar-title class="font-weight-bold">Cadastrar Nova Estampa</v-toolbar-title>
        </v-toolbar>
        <v-card-text class="py-4">
             <v-form ref="form" @submit.prevent="submitNewStamp">
                <v-text-field
                v-model="newStamp.name"
                label="Código / Referência da Estampa"
                variant="outlined"
                :rules="[rules.required]"
                autofocus
                ></v-text-field>

                <v-autocomplete
                    v-model="newStamp.folder_id"
                    :items="folders"
                    item-title="name"
                    item-value="id"
                    label="Pasta (Opcional)"
                    variant="outlined"
                    clearable
                ></v-autocomplete>

                <v-file-input
                  @change="handleFileChange"
                  label="Arquivo da Imagem (.png, .jpg)"
                  variant="outlined"
                  accept="image/png, image/jpeg"
                  :rules="[rules.fileRequired]"
                ></v-file-input>

                <v-img
                v-if="imagePreviewUrl"
                :src="imagePreviewUrl"
                max-height="150"
                contain
                class="rounded border my-4"
                ></v-img>

                <button type="submit" style="display: none;"></button>
            </v-form>
        </v-card-text>
        <v-card-actions class="dialog-footer">
            <v-spacer></v-spacer>
            <v-btn text @click="$emit('close')">Cancelar</v-btn>
            <v-btn
                :loading="isSubmitting"
                :disabled="isSubmitting"
                @click="submitNewStamp"
                color="primary"
                variant="flat"
            >
                Salvar Estampa
            </v-btn>
        </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { VForm } from 'vuetify/components';
import { supabase } from '@/api/supabase';
import { gestaoApi } from '@/api/gestaoClick';

const props = defineProps({
  show: Boolean,
  stampData: Object,
  folders: Array,
});
const emit = defineEmits(['close', 'save']);

const form = ref<VForm | null>(null);
const isSubmitting = ref(false);
const imagePreviewUrl = ref<string | null>(null);

const newStamp = reactive({
  name: '',
  file: null as File | null, // Armazenará um único arquivo
  folder_id: null,
});

const rules = {
  required: (v: string) => !!v || 'Campo obrigatório.',
  // CORREÇÃO 3: Regra ajustada para verificar o estado reativo diretamente
  fileRequired: () => !!newStamp.file || 'É obrigatório selecionar um arquivo.',
};

watch(() => props.show, (newVal) => {
    if (!newVal) {
        form.value?.reset();
        form.value?.resetValidation();
        newStamp.file = null;
        newStamp.name = '';
        newStamp.folder_id = null;
        if (imagePreviewUrl.value) {
            URL.revokeObjectURL(imagePreviewUrl.value);
            imagePreviewUrl.value = null;
        }
    }
});

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value);
  }
  if (target.files && target.files[0]) {
    const file = target.files[0];
    newStamp.file = file; // Atribui o objeto File diretamente
    imagePreviewUrl.value = URL.createObjectURL(file);
  } else {
    newStamp.file = null;
    imagePreviewUrl.value = null;
  }
};

const submitNewStamp = async () => {
    if (isSubmitting.value || !form.value) return;

    const { valid } = await form.value.validate();
    if (!valid) return;

    isSubmitting.value = true;
    try {
        const file = newStamp.file;
        if (!file) {
            throw new Error("Arquivo não encontrado.");
        }
        const stampName = newStamp.name;

        const newService = await gestaoApi.cadastrarServico(stampName);

        const filePath = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        // CORREÇÃO 4: Aguarda o upload finalizar e verifica por erros
        const { error: uploadError } = await supabase.storage
            .from('stamp-library')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
            .from('stamp-library')
            .getPublicUrl(filePath);

        await supabase.from('stamp_library').insert({
            gestao_click_service_id: newService.id,
            name: stampName,
            image_url: publicUrlData.publicUrl,
            folder_id: newStamp.folder_id,
        });

        emit('save');
    } catch (err) {
        console.error("Erro ao cadastrar estampa:", err);
    } finally {
        isSubmitting.value = false;
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
