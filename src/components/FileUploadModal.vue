<template>
  <v-dialog :model-value="show" @update:model-value="closeModal" max-width="600px" persistent>
    <v-card class="glassmorphism-card">
      <v-card-title class="dialog-header">
        <span class="text-h5">{{ title }}</span>
      </v-card-title>
      <v-card-text class="py-4">
        <p class="mb-4 text-medium-emphasis">
          Anexe o arquivo de arte para o pedido de <strong>{{ order?.customer_name || 'Cliente' }}</strong>.
          Esta ação será registrada no histórico do pedido.
        </p>
        <v-file-input
          v-model="artFile"
          label="Anexar arquivo de arte"
          accept="image/*,.pdf,.cdr,.ai,.zip,.rar"
          variant="outlined"
          prepend-icon="mdi-file-upload-outline"
          :rules="[fileRule]"
        ></v-file-input>
        <v-textarea
          v-model="comment"
          label="Adicionar um comentário (opcional)"
          variant="outlined"
          rows="3"
          counter
        ></v-textarea>

        <v-alert v-if="error" type="error" class="mt-4" closable @click:close="error = null">
          {{ error }}
        </v-alert>

      </v-card-text>
      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="closeModal">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="submitFile"
          :loading="isUploading"
          :disabled="isFileSelected"
        >
          <v-icon start>mdi-upload</v-icon>
          Enviar Arquivo
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  show: Boolean,
  order: Object as () => any | null,
  title: {
    type: String,
    default: 'Anexar Arquivo de Arte'
  }
});
const emit = defineEmits(['close', 'uploaded']);

const userStore = useUserStore();
const isUploading = ref(false);
const artFile = ref<File[] | File | null>([]);
const comment = ref('');
const error = ref<string | null>(null);

const isFileSelected = computed(() => {
  if (Array.isArray(artFile.value)) {
    return artFile.value.length === 0;
  }
  return !artFile.value;
});

const fileRule = (value: File[] | File | undefined | null) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return 'O anexo é obrigatório.';
    return true;
};

const closeModal = () => {
  artFile.value = [];
  comment.value = '';
  error.value = null;
  emit('close');
};

const submitFile = async () => {
  error.value = null;

  let fileToUpload: File | null = null;
  if (Array.isArray(artFile.value)) {
    fileToUpload = artFile.value[0] || null;
  } else if (artFile.value instanceof File) {
    fileToUpload = artFile.value;
  }

  if (!fileToUpload || !(fileToUpload instanceof File)) {
    error.value = "Nenhum arquivo válido selecionado. Por favor, anexe um arquivo.";
    return;
  }

  if (!props.order || !userStore.profile) {
    error.value = "Erro interno: dados do pedido ou do usuário estão faltando. Tente recarregar a página.";
    return;
  }

  isUploading.value = true;

  const newStatus = props.title.toLowerCase().includes('finaliza') ? 'finalizing' : 'customer_approval';
  const sanitizedFileName = fileToUpload.name.replace(/\s/g, '_');

  // *** AQUI ESTÁ A CORREÇÃO PRINCIPAL ***
  // Adiciona um timestamp para garantir que o nome do arquivo seja sempre único.
  const timestamp = Date.now();
  const filePath = `${props.order.id}/${newStatus}/${timestamp}-${sanitizedFileName}`;

  try {
    const { error: uploadError } = await supabase.storage
        .from('arts')
        .upload(filePath, fileToUpload, { upsert: true }); // upsert mantido por segurança
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('arts').getPublicUrl(filePath);

    let description = `Arquivo "${fileToUpload.name}" anexado.`;
    if (comment.value.trim()) {
        description += ` Comentário: "${comment.value.trim()}"`;
    }
    const { error: logError } = await supabase
      .from('order_logs')
      .insert({
        order_id: props.order.id,
        profile_id: userStore.profile.id,
        log_type: 'FILE_UPLOAD',
        description: description,
        metadata: { file_url: urlData.publicUrl }
      });
    if (logError) throw logError;

    emit('uploaded', urlData.publicUrl);
    closeModal();

  } catch (error: any) {
    console.error('Erro no upload de arquivo:', error);
    error.value = `Erro: ${error.message}`;
  } finally {
    isUploading.value = false;
  }
};
</script>

<style scoped>
.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.75) !important;
  border-radius: 12px !important;
}
.dialog-header, .dialog-footer {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
