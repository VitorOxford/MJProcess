<template>
  <div class="d-flex chat-audit-container">
    <div class="channel-list-panel">
      <v-text-field
        v-model="channelSearch"
        placeholder="Buscar canal..."
        variant="solo"
        hide-details
        dense
        class="pa-2"
        prepend-inner-icon="mdi-magnify"
      ></v-text-field>
      <v-list nav class="py-0 channel-list-scroll">
        <v-list-item
          v-for="channel in filteredChannels"
          :key="channel.id"
          @click="selectChannel(channel)"
          :active="activeChannel?.id === channel.id"
          lines="two"
        >
          <template v-slot:prepend>
            <v-avatar size="32" :color="channel.is_deleted ? 'rgba(255, 82, 82, 0.3)' : 'transparent'">
              <v-img v-if="channel.icon_image_url" :src="channel.icon_image_url" cover></v-img>
              <v-icon v-else :icon="channel.is_private_dm ? 'mdi-account' : 'mdi-pound'"></v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-bold text-body-2">{{ channel.name }}</v-list-item-title>
          <v-list-item-subtitle v-if="channel.is_deleted" class="text-error font-italic">
            (Canal Apagado)
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </div>

    <div class="message-viewer-panel">
        <div v-if="!activeChannel" class="d-flex flex-column align-center justify-center fill-height text-medium-emphasis">
            <v-icon size="64" class="mb-4">mdi-email-search-outline</v-icon>
            <p class="text-h6">Selecione um canal para auditar.</p>
        </div>
         <div v-else-if="loadingMessages" class="d-flex align-center justify-center fill-height">
            <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
        </div>
        <div v-else class="fill-height d-flex flex-column">
            <v-toolbar color="rgba(0,0,0,0.2)" density="compact">
                <v-toolbar-title class="font-weight-bold">{{ activeChannel.name }}</v-toolbar-title>
            </v-toolbar>
            <div class="message-list-wrapper pa-4">
                 <div v-for="message in messages" :key="message.id" class="message-item" :class="{'deleted-message': message.is_deleted}">
                    <v-avatar size="32" class="mr-3 mt-1">
                        <v-img :src="message.profiles.avatar_url" />
                    </v-avatar>
                    <div class="message-content">
                        <div class="d-flex justify-space-between">
                            <span class="font-weight-bold">{{ message.profiles.full_name }}</span>
                            <span class="text-caption text-grey">{{ formatDate(message.created_at) }}</span>
                        </div>
                        <p v-if="!message.is_deleted" class="text-body-2">{{ message.content }}</p>
                        <p v-else class="font-italic text-grey-lighten-1">
                          <v-icon size="small">mdi-cancel</v-icon>
                          Mensagem apagada. Conteúdo original: "{{ message.original_content || 'N/A' }}"
                        </p>
                    </div>
                 </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
type Channel = { id: number; name: string; icon_image_url: string | null; is_private_dm: boolean; is_deleted: boolean };
type Message = {
  id: number;
  content: string;
  original_content: string;
  created_at: string;
  is_deleted: boolean;
  profiles: { full_name: string; avatar_url: string };
};

// State
const channels = ref<Channel[]>([]);
const channelSearch = ref('');
const activeChannel = ref<Channel | null>(null);
const messages = ref<Message[]>([]);
const loadingMessages = ref(false);

const filteredChannels = computed(() =>
  channels.value.filter(c => c.name.toLowerCase().includes(channelSearch.value.toLowerCase()))
);

// USA A LÓGICA CORRETA DO CHAT ORIGINAL, CONSULTANDO A VIEW DE ADMIN
const fetchChannels = async () => {
  const { data } = await supabase.from('admin_channels').select('*');
  channels.value = data || [];
};

const selectChannel = async (channel: Channel) => {
  activeChannel.value = channel;
  loadingMessages.value = true;
  // CONSULTA A VIEW DE MENSAGENS DE ADMIN
  const { data } = await supabase
    .from('admin_messages')
    .select('*, profiles(full_name, avatar_url)')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: true });
  messages.value = data as any;
  loadingMessages.value = false;
};

const formatDate = (dateString: string) => format(new Date(dateString), "dd/MM/yy HH:mm", { locale: ptBR });

onMounted(fetchChannels);
</script>

<style scoped lang="scss">
.chat-audit-container {
    height: 70vh;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
}
.channel-list-panel {
    width: 320px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
}
.channel-list-scroll {
    flex-grow: 1;
    overflow-y: auto;
}
.message-viewer-panel {
    flex-grow: 1;
}
.message-list-wrapper {
    overflow-y: auto;
    flex-grow: 1;
}
.message-item {
    display: flex;
    align-items: flex-start;
    padding: 8px 4px;
    border-radius: 4px;
    &.deleted-message {
        opacity: 0.6;
    }
}
.message-content {
    flex-grow: 1;
}
</style>
