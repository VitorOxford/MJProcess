<template>
  <v-card-text>
    <v-row>
      <v-col cols="12" md="7">
        <h3 class="text-h6 mb-4">Criar Notificação</h3>
        <v-textarea
            v-model="notificationContent"
            label="Conteúdo da notificação"
            variant="outlined"
            rows="4"
            counter
            maxlength="255"
            class="mb-4"
            autofocus
        ></v-textarea>
         <v-text-field
            v-model="redirectUrl"
            label="URL de Redirecionamento (Opcional)"
            placeholder="/tasks"
            variant="outlined"
            class="mb-2"
        ></v-text-field>
        <v-switch v-model="sendToAll" label="Enviar para todos os usuários" color="primary" inset hide-details></v-switch>
        <v-autocomplete
            v-if="!sendToAll"
            v-model="selectedRecipient"
            :items="allUsers"
            item-title="full_name"
            item-value="id"
            label="Destinatário Específico"
            variant="outlined"
            clearable
            class="mt-4"
        >
             <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :prepend-avatar="item.raw.avatar_url" :title="item.raw.full_name"></v-list-item>
            </template>
        </v-autocomplete>

        <v-btn @click="sendNotification" :loading="isSending" :disabled="!isFormValid" color="primary" size="large" block class="mt-6">
            <v-icon left>mdi-send</v-icon>
            Enviar Notificação
        </v-btn>
      </v-col>
      <v-col cols="12" md="5" class="d-flex align-center justify-center">
         <div class="notification-preview-box">
            <div class="d-flex align-start">
                <v-avatar class="mr-3" size="40" :image="userStore.profile?.avatar_url"></v-avatar>
                <div>
                    <strong class="preview-sender-name">{{ userStore.profile?.full_name || 'Admin' }}</strong>
                    <div class="preview-content">{{ notificationContent || 'Sua mensagem aparecerá aqui...' }}</div>
                </div>
            </div>
        </div>
      </v-col>
    </v-row>
  </v-card-text>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

type Profile = { id: string; full_name: string; avatar_url: string; };
const userStore = useUserStore();
const allUsers = ref<Profile[]>([]);
const isSending = ref(false);
const notificationContent = ref('');
const redirectUrl = ref('');
const sendToAll = ref(true);
const selectedRecipient = ref<string | null>(null);

const isFormValid = computed(() => {
    if (!notificationContent.value.trim()) return false;
    if (!sendToAll.value && !selectedRecipient.value) return false;
    return true;
});

const fetchUsers = async () => {
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
  allUsers.value = data || [];
};

const sendNotification = async () => {
    isSending.value = true;
    const { error } = await supabase.from('notifications').insert({
      content: notificationContent.value.trim(),
      sender_id: userStore.profile?.id,
      recipient_id: sendToAll.value ? null : selectedRecipient.value,
      redirect_url: redirectUrl.value.trim() || null
    });

    if(!error) {
        notificationContent.value = '';
        redirectUrl.value = '';
        selectedRecipient.value = null;
    }
    isSending.value = false;
};

onMounted(fetchUsers);
</script>

<style scoped lang="scss">
.notification-preview-box {
    background-color: rgba(30, 30, 35, 0.9);
    border-radius: 8px;
    padding: 16px;
    width: 100%;
    max-width: 400px;
    min-height: 100px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    color: #E0E0E0;
    transition: all 0.3s ease;
    .preview-sender-name { font-weight: bold; color: #FFFFFF; }
    .preview-content { margin-top: 4px; line-height: 1.5; word-wrap: break-word; }
}
</style>
