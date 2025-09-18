<template>
  <v-dialog :model-value="show" @update:model-value="close" max-width="600px" persistent>
    <v-card class="glassmorphism-card">
      <v-card-title class="dialog-header">
        <span class="text-h5">Finalizar e Enviar para Aprovação</span>
      </v-card-title>

      <v-card-text class="py-4">
        <p class="mb-4">
          Anexe a arte final para o pedido de
          <strong>{{ order?.customer_name || 'Cliente' }}</strong>.
          O vendedor será notificado para obter a aprovação final.
        </p>

        <v-file-input
          v-model="artFile"
          label="Anexar arte final"
          accept="image/*,.pdf,.cdr,.ai"
          variant="outlined"
          prepend-icon="mdi-image-plus"
          :rules="[fileRule]"
        ></v-file-input>

        <div v-if="imagePreview" class="my-3 text-center">
            <v-img :src="imagePreview" max-height="200" contain></v-img>
            <p class="text-caption mt-1">{{ artFile[0]?.name }}</p>
        </div>

      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="close">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="submitForApproval"
          :loading="isUploading"
          :disabled="!artFile.length"
        >
          <v-icon start>mdi-send-check</v-icon>
          Enviar para Aprovação
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

<<<<<<< HEAD
// ---- PROPS E EMITS ----
=======
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
const props = defineProps({
  show: Boolean,
  order: Object as () => any | null,
});
const emit = defineEmits(['close', 'approved']);

<<<<<<< HEAD
// ---- ESTADO ----
=======
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
const userStore = useUserStore();
const artFile = ref<File[]>([]);
const imagePreview = ref<string | null>(null);
const isUploading = ref(false);

<<<<<<< HEAD
// ---- REGRAS E WATCHERS ----
=======
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
const fileRule = (value: File[]) => !!value.length || 'A arte final é obrigatória.';

watch(artFile, (newFile) => {
  if (newFile && newFile.length > 0) {
    const file = newFile[0];
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.value = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
        imagePreview.value = null;
    }
  } else {
    imagePreview.value = null;
  }
});

<<<<<<< HEAD
// ---- FUNÇÕES ----
=======
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
const close = () => {
    artFile.value = [];
    imagePreview.value = null;
    emit('close');
}

const submitForApproval = async () => {
  if (!artFile.value.length || !props.order || !userStore.profile) return;
  isUploading.value = true;
  const file = artFile.value[0];
  const filePath = `final_arts/${props.order.id}/${file.name}`;

  try {
<<<<<<< HEAD
    // 1. Upload da arte
=======
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
    const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);

<<<<<<< HEAD
    // 2. Atualizar o pedido
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            // --- MUDANÇA IMPORTANTE AQUI ---
            status: 'production_queue', // Em vez de 'customer_approval' ou 'production_scheduled'
=======
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            status: 'production_queue',
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
            details: { ...props.order.details, final_art_url: urlData.publicUrl }
        })
        .eq('id', props.order.id);
    if (updateError) throw updateError;

<<<<<<< HEAD
    // 3. Enviar notificação para o criador do pedido (vendedor)
    // Vamos simplificar a notificação por agora.
=======
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
     const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
          recipient_id: props.order.created_by,
          sender_id: userStore.profile.id,
          content: `A arte para o pedido de "${props.order.customer_name}" foi aprovada e enviada para a fila de produção.`,
<<<<<<< HEAD
          redirect_url: `/producao` // Link para o Kanban de produção
=======
          redirect_url: `/producao`
>>>>>>> 167a6d9 (Refatora interface de aprovações e otimiza fluxo de produção)
      });
    if (notificationError) console.error("Erro ao notificar, mas o fluxo continua:", notificationError);


    emit('approved', props.order.id);
    close();

  } catch (error: any) {
      console.error('Erro ao enviar para aprovação:', error);
      alert(`Erro: ${error.message}`);
  } finally {
      isUploading.value = false;
  }
};
</script>

<style scoped>
.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.75) !important;
  border-radius: 12px !important;
}
.dialog-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
