<template>
  <v-dialog :model-value="show" @update:model-value="close" max-width="600px" persistent>
    <v-card class="glassmorphism-card">
      <v-card-title class="dialog-header">
        <span class="text-h5">Solicitar Alteração na Arte</span>
      </v-card-title>
      <v-card-text class="py-4">
        <p class="mb-4 text-medium-emphasis">
          Descreva as alterações necessárias para o pedido de
          <strong>{{ order?.customer_name || 'Cliente' }}</strong>. Os designers e administradores serão notificados.
        </p>
        <v-select
          v-model="reason"
          :items="reasons"
          label="Motivo Principal"
          variant="outlined"
          class="mb-4"
        ></v-select>
        <v-textarea
          v-model="comment"
          label="Detalhes da alteração (obrigatório)"
          variant="outlined"
          rows="4"
          counter
          :rules="[rules.required]"
        ></v-textarea>
      </v-card-text>
      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="close">Cancelar</v-btn>
        <v-btn
          color="orange"
          variant="flat"
          @click="submitRequest"
          :loading="isSubmitting"
          :disabled="!comment.trim()"
        >
          <v-icon start>mdi-send</v-icon>
          Enviar Solicitação
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

const props = defineProps({
  show: Boolean,
  order: Object as () => any | null,
});
const emit = defineEmits(['close', 'submitted']);

const userStore = useUserStore();
const isSubmitting = ref(false);
const reason = ref('Alteração de Cor');
const comment = ref('');
const reasons = [
    'Alteração de Cor', 'Ajuste de Posicionamento', 'Redimensionar Elemento',
    'Erro de Ortografia', 'Outro (descrever abaixo)'
];
const rules = {
  required: (v: any) => !!v.trim() || 'O detalhamento é obrigatório.',
};

const close = () => {
    reason.value = 'Alteração de Cor';
    comment.value = '';
    emit('close');
}

const submitRequest = async () => {
  if (!comment.value.trim() || !props.order || !userStore.profile) return;
  isSubmitting.value = true;
  try {
    const description = `[${reason.value}] ${comment.value}`;

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'changes_requested' })
      .eq('id', props.order.id);
    if (updateError) throw updateError;

    const { error: logError } = await supabase
      .from('order_logs')
      .insert({
        order_id: props.order.id,
        profile_id: userStore.profile.id,
        log_type: 'COMMENT',
        description: description,
      });
    if (logError) throw logError;

    const { data: usersToNotify, error: fetchUsersError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['designer', 'admin']);

    if (fetchUsersError) throw fetchUsersError;

    if (usersToNotify && usersToNotify.length > 0) {
      const notificationInserts = usersToNotify.map(user => ({
        recipient_id: user.id,
        sender_id: userStore.profile!.id,
        content: `Alteração solicitada para o pedido de "${props.order.customer_name}".`,
        redirect_url: `/design`
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationInserts);

      if (notificationError) throw notificationError;
    }


    emit('submitted');
    close();
  } catch (error: any) {
    console.error('Erro ao solicitar alteração:', error);
    alert(`Erro: ${error.message}`);
  } finally {
    isSubmitting.value = false;
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
