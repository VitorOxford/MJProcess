<template>
  <div
    class="d-flex app-container"
    :style="{ backgroundImage: `url(${currentBackground})` }"
  >
    <v-navigation-drawer
      v-model="leftDrawer"
      :permanent="!isMobile"
      :temporary="isMobile"
      location="left"
      width="320"
      class="left-sidebar"
    >
      <div class="sidebar-header pa-3">
        <v-text-field
          v-model="searchQuery"
          :placeholder="searchPlaceholder"
          variant="solo"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
        ></v-text-field>
      </div>

      <v-tabs v-model="leftSidebarTab" grow stacked density="compact">
        <v-tab value="groups" title="Grupos">
          <v-badge
            v-if="unreadGroupsCount > 0"
            :content="unreadGroupsCount"
            color="error"
            inline
            overlap
            bordered
            class="mr-1"
          >
            <v-icon>mdi-account-group-outline</v-icon>
          </v-badge>
          <template v-else>
            <v-icon>mdi-account-group-outline</v-icon>
          </template>
        </v-tab>
        <v-tab value="dms" title="Mensagens Diretas">
           <v-badge
            v-if="unreadDMsCount > 0"
            :content="unreadDMsCount"
            color="error"
            inline
            overlap
            bordered
            class="mr-1"
          >
            <v-icon>mdi-account-circle-outline</v-icon>
          </v-badge>
           <template v-else>
            <v-icon>mdi-account-circle-outline</v-icon>
          </template>
        </v-tab>
        <v-tab v-if="isAdmin" value="audit" title="Auditoria">
          <v-icon>mdi-eye-outline</v-icon>
        </v-tab>
      </v-tabs>
      <v-divider></v-divider>

      <v-window v-model="leftSidebarTab" class="sidebar-content">
        <v-window-item value="groups">
          <v-list nav class="py-0">
            <v-list-item
              v-for="channel in filteredPublicChannels"
              :key="channel.id"
              @click="selectChannel(channel)"
              :active="activeChannel?.id === channel.id"
              lines="two"
              class="channel-item"
            >
              <template v-slot:prepend>
                <v-avatar size="42">
                  <v-img v-if="channel.icon_image_url" :src="channel.icon_image_url" cover></v-img>
                  <v-icon v-else :icon="channel.icon"></v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold">{{ channel.name }}</v-list-item-title>
              <v-list-item-subtitle class="text-truncate">{{ channel.description || 'Grupo' }}</v-list-item-subtitle>
              <template v-slot:append>
                  <v-badge
                    v-if="unreadMessageCounts.get(channel.id) > 0"
                    :content="unreadMessageCounts.get(channel.id)"
                    color="error"
                    inline
                  ></v-badge>
              </template>
            </v-list-item>
             <div v-if="filteredPublicChannels.length === 0" class="empty-list-notice">
                <p>Nenhum grupo encontrado.</p>
                <v-btn size="small" variant="tonal" @click="openCreateChannelDialog" class="mt-2">Criar Grupo</v-btn>
            </div>
          </v-list>
        </v-window-item>

        <v-window-item value="dms">
          <v-list nav class="py-0">
            <v-list-item
              v-for="channel in filteredDirectMessageChannels"
              :key="channel.id"
              @click="selectChannel(channel)"
              :active="activeChannel?.id === channel.id"
              lines="two"
              class="channel-item"
            >
              <template v-slot:prepend>
                 <v-badge
                    dot
                    location="bottom end"
                    offset-x="8"
                    offset-y="8"
                    :color="isUserOnline(getDmUser(channel)?.id) ? 'success' : 'grey'"
                    bordered
                  >
                  <v-avatar size="42">
                    <v-img v-if="getDmUser(channel)?.avatar_url" :src="getDmUser(channel)?.avatar_url" cover></v-img>
                    <v-icon v-else>mdi-account</v-icon>
                  </v-avatar>
                </v-badge>
              </template>
              <v-list-item-title class="font-weight-bold">{{ getDmUser(channel)?.full_name || 'DM' }}</v-list-item-title>
              <v-list-item-subtitle class="text-truncate">{{ isUserOnline(getDmUser(channel)?.id) ? 'Online' : 'Offline' }}</v-list-item-subtitle>
              <template v-slot:append>
                  <v-badge
                    v-if="unreadMessageCounts.get(channel.id) > 0"
                    :content="unreadMessageCounts.get(channel.id)"
                    color="error"
                    inline
                  ></v-badge>
              </template>
            </v-list-item>
            <div v-if="filteredDirectMessageChannels.length === 0" class="empty-list-notice">
                <p>Nenhuma conversa encontrada.</p>
            </div>
          </v-list>
        </v-window-item>

        <v-window-item v-if="isAdmin" value="audit">
            <v-list nav class="py-0">
                <v-list-item
                  v-for="channel in filteredAuditChannels"
                  :key="`audit-${channel.id}`"
                  @click="selectAuditChannel(channel)"
                  :active="activeChannel?.id === channel.id && isAuditorMode"
                  class="channel-item"
                >
                  <template v-slot:prepend>
                    <v-avatar size="42">
                      <v-img v-if="channel.icon_image_url" :src="channel.icon_image_url" cover></v-img>
                      <v-icon v-else :icon="channel.icon"></v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-bold">
                    {{ channel.name }}
                    <v-icon v-if="channel.is_deleted" size="small" color="error" class="ml-1">mdi-delete-alert</v-icon>
                  </v-list-item-title>
                </v-list-item>
                 <div v-if="filteredAuditChannels.length === 0" class="empty-list-notice">
                    <p>Nenhum canal para auditar.</p>
                </div>
            </v-list>
        </v-window-item>
      </v-window>
    </v-navigation-drawer>



    <div class="chat-area-wrapper">
      <div v-if="activeChannel" class="chat-container">
        <div class="chat-header pa-3">
          <div class="d-flex align-center">
            <v-btn v-if="isMobile" icon="mdi-menu" variant="text" @click="leftDrawer = !leftDrawer" class="mr-2"></v-btn>

            <v-avatar size="42" class="mr-3">
              <v-img v-if="headerImageUrl" :src="headerImageUrl" cover></v-img>
              <v-icon v-else :icon="headerIcon" size="24"></v-icon>
            </v-avatar>
            <div>
              <h1 class="chat-title">{{ headerTitle }}</h1>
              <div class="chat-subtitle">
                <span v-if="isDirectMessageActive && !isAuditorMode">
                    {{ isOtherUserOnline ? 'Online' : 'Offline' }}
                </span>
                <span v-else-if="!isDirectMessageActive">{{ activeChannel.description || 'Descrição do canal' }}</span>
              </div>
            </div>
            <v-chip v-if="isAuditorMode" size="small" color="warning" variant="flat" class="ml-4">
                <v-icon start icon="mdi-eye"> </v-icon> Modo Auditor
            </v-chip>
          </div>
          <v-spacer></v-spacer>
          <div class="chat-header-actions">
             <v-btn v-if="!isMobile" icon="mdi-phone-outline" variant="text" title="Iniciar chamada de voz"></v-btn>
            <v-btn icon="mdi-information-outline" variant="text" @click="rightDrawer = !rightDrawer" title="Ver informações"></v-btn>
          </div>
        </div>

        <div class="messages-list pa-md-6 pa-3" ref="messagesContainer">
             <div v-for="(group, index) in groupedMessages" :key="index" class="message-group" :class="{ 'my-message-group': isMyMessage(group.messages[0]) && !isAuditorMode }">
                <div class="d-flex align-start" :class="{'flex-row-reverse': isMyMessage(group.messages[0]) && !isAuditorMode}">
                    <v-avatar size="40" class="message-avatar" v-if="!isMyMessage(group.messages[0]) || isAuditorMode">
                        <v-img :src="group.profile?.avatar_url" :alt="group.profile?.full_name"></v-img>
                    </v-avatar>
                    <div class="message-content-wrapper">
                         <div class="font-weight-bold message-sender-name" v-if="!isMyMessage(group.messages[0]) || isAuditorMode">
                            {{ group.profile?.full_name || 'Usuário' }}
                        </div>
                        <div
                          v-for="message in group.messages"
                          :key="message.id"
                          class="message-bubble"
                          :class="{
                            'my-bubble': isMyMessage(message) && !isAuditorMode,
                            'other-bubble': !isMyMessage(message) || isAuditorMode,
                            'deleted-admin-bubble': message.is_deleted && isAuditorMode,
                            'highlighted-message': message.id === highlightedMessageId
                          }"
                        >
                            <template v-if="message.is_deleted && !isAuditorMode">
                                <div class="deleted-message-content">
                                    <v-icon size="small" class="mr-2">mdi-cancel</v-icon>
                                    <em>Mensagem apagada</em>
                                </div>
                            </template>
                            <template v-else>
                                <div v-if="message.is_edited && isAdmin && isAuditorMode" class="original-content-admin mb-1">
                                    <strong>Original:</strong> <em>{{ message.original_content || 'N/A' }}</em>
                                </div>
                                <div v-if="message.message_type === 'image' && message.display_content" class="message-image-container" @click="openImageModal(message.display_content, message.content.split('/').pop() || '', 'image')">
                                    <v-img :src="message.display_content" class="message-image" aspect-ratio="16/9" cover></v-img>
                                </div>
                                <div v-else-if="message.message_type === 'file' && message.display_content" class="file-message-container">
                                    <v-icon class="file-icon">mdi-file-outline</v-icon>
                                    <div class="file-info">
                                        <a :href="message.display_content" target="_blank" download class="file-name">{{ getFileNameFromPath(message.content) }}</a>
                                        <span class="file-size">Documento</span>
                                    </div>
                                </div>
                                <div v-else class="message-text" v-html="message.content"></div>
                            </template>

                            <div class="message-metadata">
                                <span v-if="message.is_edited && !message.is_deleted" class="edited-indicator">(editado)</span>
                                <span v-if="message.is_deleted && isAuditorMode" class="deleted-indicator-admin">(APAGADA)</span>
                                <span class="message-time">{{ formatTime(message.created_at) }}</span>
                                <v-icon v-if="isMyMessage(message)" size="small" class="ml-1 read-receipt">mdi-check-all</v-icon>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="chat-input-container pa-2 pa-md-4" v-if="!isAuditorMode">
          <v-textarea
            v-model="newMessage"
            placeholder="Digite sua mensagem..."
            rows="1"
            max-rows="5"
            auto-grow
            variant="solo"
            class="chat-input"
            hide-details
            @keydown.enter.prevent="handleSendMessage()"
          >
            <template v-slot:prepend-inner>
              <v-menu location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-paperclip" variant="text"></v-btn>
                </template>
                <v-list density="compact" class="menu-card">
                  <v-list-item @click="triggerImageFileInput">
                      <template v-slot:prepend><v-icon>mdi-image-outline</v-icon></template>
                      <v-list-item-title>Enviar Imagem/Vídeo</v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="triggerDocFileInput">
                      <template v-slot:prepend><v-icon>mdi-file-document-outline</v-icon></template>
                      <v-list-item-title>Enviar Documento</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </template>
            <template v-slot:append-inner>
              <v-btn icon="mdi-send" color="primary" variant="flat" @click="handleSendMessage()" :disabled="!newMessage.trim()"></v-btn>
            </template>
          </v-textarea>
        </div>
      </div>

      <div v-else class="d-flex flex-column align-center justify-center fill-height empty-chat-area">
        <v-icon size="80" class="mb-4 text-medium-emphasis">mdi-forum-outline</v-icon>
        <p class="text-h5">Bem-vindo ao MJchat</p>
        <p class="text-medium-emphasis mt-1">Selecione uma conversa para começar.</p>
      </div>
    </div>


    <v-navigation-drawer
      v-model="rightDrawer"
      :temporary="true"
      location="right"
      width="320"
      class="right-sidebar"
    >
      <div v-if="activeChannel" class="fill-height d-flex flex-column">
        <div class="sidebar-header pa-3 d-flex align-center">
          <h3 class="ml-2">Sobre a Conversa</h3>
          <v-spacer></v-spacer>
          <v-menu location="bottom end">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
            </template>
            <v-list>
              <v-list-item
                v-if="isAdmin || userProfile?.id === activeChannel?.created_by"
                @click="openEditChannelDialog"
              >
                <v-list-item-title>Editar grupo</v-list-item-title>
                <template v-slot:prepend><v-icon>mdi-pencil</v-icon></template>
              </v-list-item>
              <v-list-item
                v-if="isAdmin || userProfile?.id === activeChannel?.created_by"
                @click="openManageMembersDialog"
              >
                <v-list-item-title>Gerenciar membros</v-list-item-title>
                <template v-slot:prepend><v-icon>mdi-account-multiple-plus</v-icon></template>
              </v-list-item>
              <v-list-item
                v-if="isAdmin || userProfile?.id === activeChannel?.created_by"
                @click="handleDeleteChannel"
              >
                <v-list-item-title>Excluir grupo</v-list-item-title>
                <template v-slot:prepend><v-icon color="error">mdi-delete</v-icon></template>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn icon="mdi-close" variant="text" @click="rightDrawer = false"></v-btn>
        </div>
        <div class="text-center pa-4">
            <v-avatar size="80" class="mb-3">
                <v-img v-if="headerImageUrl" :src="headerImageUrl" cover></v-img>
                <v-icon v-else :icon="headerIcon" size="48"></v-icon>
            </v-avatar>
            <h2 class="text-h6">{{ headerTitle }}</h2>
            <p class="text-body-2 text-medium-emphasis">{{ isDirectMessageActive ? 'Conversa pessoal' : (activeChannel.description || 'Sem descrição.') }}</p>
        </div>
        <v-divider></v-divider>
        <v-tabs v-model="rightSidebarTab" fixed-tabs>
          <v-tab v-if="!isDirectMessageActive" value="members">Membros</v-tab>
          <v-tab value="media">Mídias</v-tab>
          <v-tab value="files">Arquivos</v-tab>
          <v-tab value="audios">Áudios</v-tab>
        </v-tabs>

        <v-window v-model="rightSidebarTab" class="sidebar-content">
             <v-window-item v-if="!isDirectMessageActive" value="members" class="fill-height">
                <v-list nav>
                    <v-list-subheader>MEMBROS ({{ activeChannelMembers.length }})</v-list-subheader>
                     <v-list-item
                        v-for="user in activeChannelMembers"
                        :key="user.id"
                        @click="startNewDirectMessage(user)"
                        class="user-item"
                     >
                        <template v-slot:prepend>
                            <v-badge
                                dot
                                location="bottom end"
                                offset-x="8"
                                offset-y="8"
                                :color="isUserOnline(user.id) ? 'success' : 'grey'"
                                bordered
                            >
                                <v-avatar size="32"><v-img :src="user.avatar_url"></v-img></v-avatar>
                            </v-badge>
                        </template>
                        <v-list-item-title>{{ user.full_name }}</v-list-item-title>
                        <v-list-item-subtitle v-if="user.id === activeChannel.created_by">Criador do grupo</v-list-item-subtitle>
                     </v-list-item>
                </v-list>
            </v-window-item>
            <v-window-item value="media" class="fill-height">
                <div v-if="mediaImages.length > 0" class="media-grid pa-2">
                  <v-card
                    v-for="media in mediaImages"
                    :key="media.id"
                    class="media-item"
                    @click="openImageModal(media.display_content, getFileNameFromPath(media.content), media.message_type)"
                  >
                    <v-img :src="media.display_content" aspect-ratio="1" cover class="media-image"></v-img>
                  </v-card>
                </div>
                <div v-else class="empty-list-notice">
                  <p>Nenhuma mídia compartilhada.</p>
                </div>
              </v-window-item>
              <v-window-item value="files" class="fill-height">
                <div v-if="mediaFiles.length > 0" class="media-grid pa-2">
                  <v-card
                    v-for="media in mediaFiles"
                    :key="media.id"
                    class="media-item"
                    @click="openImageModal(media.display_content, getFileNameFromPath(media.content), media.message_type)"
                  >
                    <div class="file-placeholder">
                      <v-icon size="x-large">mdi-file-outline</v-icon>
                      <span class="file-placeholder-text">{{ getFileNameFromPath(media.content) }}</span>
                    </div>
                  </v-card>
                </div>
                <div v-else class="empty-list-notice">
                  <p>Nenhum arquivo compartilhado.</p>
                </div>
              </v-window-item>
              <v-window-item value="audios" class="fill-height">
                <div v-if="mediaAudios.length > 0" class="media-grid pa-2">
                  <v-card
                    v-for="media in mediaAudios"
                    :key="media.id"
                    class="media-item"
                  >
                    <audio :src="media.display_content" controls style="width: 100%"></audio>
                    <div class="file-placeholder-text">{{ getFileNameFromPath(media.content) }}</div>
                  </v-card>
                </div>
                <div v-else class="empty-list-notice">
                  <p>Nenhum áudio compartilhado.</p>
                </div>
              </v-window-item>
        </v-window>
       </div>
       <div v-else class="d-flex align-center justify-center fill-height">
           <p>Selecione uma conversa</p>
       </div>
    </v-navigation-drawer>

    <input type="file" ref="imageFileInput" @change="onImageFileSelected" accept="image/*,video/*" style="display: none;" />
    <input type="file" ref="docFileInput" @change="onDocFileSelected" accept="*/*" style="display: none;" />
    <input type="file" ref="channelIconInput" @change="onChannelIconSelected" accept="image/*" style="display: none;" />

    <v-dialog v-model="showCreateChannelDialog" max-width="700px" persistent>
        <v-card class="dialog-card">
            <v-card-title class="dialog-header"><span class="text-h5">Criar Novo Grupo</span></v-card-title>
            <v-card-text class="py-4">
                <v-row>
                    <v-col cols="12" sm="4" class="d-flex flex-column align-center justify-center">
                        <v-avatar size="80" class="mb-2 elevation-2">
                            <v-img v-if="imagePreviewUrl" :src="imagePreviewUrl" cover></v-img>
                            <v-icon v-else :icon="newChannelIcon" size="40"></v-icon>
                        </v-avatar>
                        <v-btn variant="tonal" size="small" @click="triggerChannelIconInput">Subir Imagem</v-btn>
                    </v-col>
                    <v-col cols="12" sm="8">
                        <v-text-field v-model="newChannelName" label="Nome do Grupo" variant="outlined" autofocus></v-text-field>
                        <v-textarea v-model="newChannelDescription" label="Descrição (opcional)" variant="outlined" rows="2"></v-textarea>
                    </v-col>
                </v-row>
                <p class="text-subtitle-1 mt-4">Adicionar Membros</p>
                <v-autocomplete
                    v-model="newChannelMembers"
                    :items="allUsers.filter(u => u.id !== loggedInUser?.id)"
                    item-title="full_name"
                    item-value="id"
                    chips
                    closable-chips
                    multiple
                    label="Selecione os usuários"
                    variant="outlined"
                ></v-autocomplete>
            </v-card-text>
            <v-card-actions class="dialog-footer">
                <v-spacer></v-spacer>
                <v-btn text @click="closeDialog('create')">Cancelar</v-btn>
                <v-btn color="primary" variant="flat" @click="handleCreateChannel" :loading="isCreatingChannel">Criar Grupo</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog v-model="showBackgroundSettingsDialog" max-width="600px" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-header">Configurações de Fundo</v-card-title>
        <v-card-text class="py-4">
            <p class="mb-4">O fundo do chat muda automaticamente. Se preferir, pode definir uma imagem estática abaixo.</p>
            <v-file-input
                v-model="selectedBackgroundImageFile"
                label="Selecionar Imagem Pessoal"
                accept="image/*"
                variant="outlined"
                prepend-icon="mdi-camera"
            ></v-file-input>
            <div class="d-flex justify-center my-3" v-if="userBackgroundImagePreview">
                <v-img :src="userBackgroundImagePreview" max-height="200" contain></v-img>
            </div>
        </v-card-text>
        <v-card-actions class="dialog-footer">
            <v-btn v-if="userPersonalBackground" color="error" variant="text" @click="removeBackgroundImage">Remover Fundo Pessoal</v-btn>
            <v-spacer></v-spacer>
            <v-btn text @click="closeBackgroundSettingsDialog">Cancelar</v-btn>
            <v-btn color="primary" variant="flat" @click="handleBackgroundUpload" :loading="isUploadingBackground">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ImageModal :show="showImageModal" :image-url="modalImageUrl" :file-name="modalImageFileName" :file-type="modalImageFileType" @close="closeImageModal" />

    <v-btn
v-if="isMobile && !leftDrawer && !activeChannel"
  icon="mdi-forum-outline"
  color="primary"
  class="drawer-fab-bottom glassmorphism-base"
  @click="leftDrawer = true"
  style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 999;"
></v-btn>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { useDisplay } from 'vuetify'; // Importa o hook de display
import { supabase } from '@/api/supabase';
import type { RealtimeChannel, User, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import ImageModal from '@/components/ImageModal.vue';

// =======================================================================
// ========================== LÓGICA DE RESPONSIVIDADE ===================
// =======================================================================
const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);
const leftDrawer = ref(!isMobile.value); // Inicia aberto no desktop, fechado no mobile

// Observa mudanças no tamanho da tela para ajustar o drawer



// =======================================================================
// ========================== TIPOS E INTERFACES =========================
// =======================================================================
type Profile = { id: string; full_name: string; role: string; avatar_url: string | null; background_image_url?: string | null; };
type Channel = { id: number; name: string; description: string | null; created_by: string; icon: string; color: string; icon_image_url: string | null; is_private_dm?: boolean; is_deleted?: boolean; deleted_at?: string | null; type?: 'group' | 'dm'; dm_participant_ids?: string[]; };
type Message = { id: number; created_at: string; edited_at: string | null; deleted_at: string | null; content: string; profile_id: string; channel_id: number; message_type: 'user' | 'system' | 'image' | 'file'; profiles?: Profile; is_deleted: boolean; is_edited: boolean; original_content: string | null; display_content?: string; };
type MessageGroup = { profile_id: string; profile: Profile | null; messages: Message[]; };


// =======================================================================
// ======================= ESTADO DO COMPONENTE (REFS) ===================
// =======================================================================

// --- Usuário e Autenticação ---
const loggedInUser = ref<User | null>(null);
const userProfile = ref<Profile | null>(null);
const isAdmin = computed(() => userProfile.value?.role === 'admin');
const allUsers = ref<Profile[]>([]);
const mediaImages = computed(() => activeChannelMedia.value.filter(m => m.message_type === 'image'));
const mediaFiles = computed(() => activeChannelMedia.value.filter(m => m.message_type === 'file' && !isAudioFile(m.content)));
const mediaAudios = computed(() => activeChannelMedia.value.filter(m => m.message_type === 'file' && isAudioFile(m.content)));

const unreadGroupsCount = computed(() =>
  filteredPublicChannels.value.reduce((sum, c) => sum + (unreadMessageCounts.value.get(c.id) || 0), 0)
);
const unreadDMsCount = computed(() =>
  filteredDirectMessageChannels.value.reduce((sum, c) => sum + (unreadMessageCounts.value.get(c.id) || 0), 0)
);

function isAudioFile(filename: string) {
  return /\.(mp3|wav|ogg|m4a|aac)$/i.test(filename);
}

// --- Estado da UI ---
const leftSidebarTab = ref('groups'); // 'groups', 'dms', 'audit'
const rightSidebarTab = ref('members'); // 'members', 'media'
const rightDrawer = ref(false); // Barra lateral direita sempre será temporária
const searchQuery = ref('');
const highlightedMessageId = ref<number | null>(null);

// --- Carrossel de Fundo ---
const backgrounds = ref([
    'https://sgspnoxsqdwbdqsvjdei.supabase.co/storage/v1/object/public/media/backgrounds/1.jpg',
    'https://sgspnoxsqdwbdqsvjdei.supabase.co/storage/v1/object/public/media/backgrounds/2.jpg',
    'https://sgspnoxsqdwbdqsvjdei.supabase.co/storage/v1/object/public/media/backgrounds/3.jpg',
    'https://sgspnoxsqdwbdqsvjdei.supabase.co/storage/v1/object/public/media/backgrounds/4.jpg',
    'https://sgspnoxsqdwbdqsvjdei.supabase.co/storage/v1/object/public/media/backgrounds/5.jpg'
]);
const userPersonalBackground = ref<string | null>(null);
const currentBackground = ref(backgrounds.value[0]);
let backgroundInterval: NodeJS.Timeout;

// --- Canais e Conversas ---
const channels = ref<Channel[]>([]);
const auditChannels = ref<Channel[]>([]);
const activeChannel = ref<Channel | null>(null);
const selectedDirectMessageUser = ref<Profile | null>(null); // Outro usuário na DM
const unreadMessageCounts = ref(new Map<number, number>());
const activeChannelMembers = ref<Profile[]>([]);
const activeChannelMedia = ref<Message[]>([]);


// --- Mensagens ---
const messages = ref<Message[]>([]);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// --- Diálogos e Modais ---
const showCreateChannelDialog = ref(false);
const showBackgroundSettingsDialog = ref(false);
const showImageModal = ref(false);
const modalImageUrl = ref('');
const modalImageFileName = ref('');
const modalImageFileType = ref('');

// --- Formulários ---
const newChannelName = ref('');
const newChannelDescription = ref('');
const newChannelIcon = ref('mdi-pound');
const newChannelMembers = ref<string[]>([]);
const isCreatingChannel = ref(false);
const channelIconInput = ref<HTMLInputElement | null>(null);
const selectedIconFile = ref<File | null>(null);
const imagePreviewUrl = ref<string | null>(null);

const selectedBackgroundImageFile = ref<File[]>([]);
const userBackgroundImagePreview = ref<string | null>(null);
const isUploadingBackground = ref(false);

// --- Arquivos ---
const imageFileInput = ref<HTMLInputElement | null>(null);
const docFileInput = ref<HTMLInputElement | null>(null);

// --- Listeners Realtime ---
const messageListener = ref<RealtimeChannel | null>(null);
const presenceChannel = ref<RealtimeChannel | null>(null);
const onlineUsers = ref<string[]>([]);

// =======================================================================
// ==================== PROPRIEDADES COMPUTADAS (COMPUTED) ===============
// =======================================================================

const isAuditorMode = computed(() => leftSidebarTab.value === 'audit');
const isDirectMessageActive = computed(() => activeChannel.value?.type === 'dm');

const searchPlaceholder = computed(() => {
    if (isAuditorMode.value) return 'Buscar em canais auditáveis...';
    return 'Buscar conversas...';
});

// --- Canais Filtrados ---
const publicChannels = computed(() => channels.value.filter(c => c.type === 'group' && !c.is_deleted));
const directMessageChannels = computed(() => channels.value.filter(c => c.type === 'dm' && !c.is_deleted).sort((a,b) => {
    const userA_isOnline = isUserOnline(getDmUser(a)?.id);
    const userB_isOnline = isUserOnline(getDmUser(b)?.id);
    if (userA_isOnline && !userB_isOnline) return -1;
    if (!userA_isOnline && userB_isOnline) return 1;
    return 0;
}));

const filteredPublicChannels = computed(() => publicChannels.value.filter(c => c.name.toLowerCase().includes(searchQuery.value.toLowerCase())));
const filteredDirectMessageChannels = computed(() => directMessageChannels.value.filter(c => {
    const user = getDmUser(c);
    return user ? user.full_name.toLowerCase().includes(searchQuery.value.toLowerCase()) : false;
}));
const filteredAuditChannels = computed(() => auditChannels.value.filter(c => c.name.toLowerCase().includes(searchQuery.value.toLowerCase())));

// --- Informações do Cabeçalho do Chat ---
const headerTitle = computed(() => {
    if (isDirectMessageActive.value) return selectedDirectMessageUser.value?.full_name || 'Conversa Privada';
    return activeChannel.value?.name || 'Selecione um Canal';
});
const headerIcon = computed(() => {
    if (isDirectMessageActive.value) return 'mdi-account';
    return activeChannel.value?.icon || 'mdi-chat';
});
const headerImageUrl = computed(() => {
    if (isDirectMessageActive.value) return selectedDirectMessageUser.value?.avatar_url;
    return activeChannel.value?.icon_image_url;
});

// --- Presença de Usuário ---
const isOtherUserOnline = computed(() => {
    if (!selectedDirectMessageUser.value) return false;
    return onlineUsers.value.includes(selectedDirectMessageUser.value.id);
});

// Agrupamento de Mensagens
const groupedMessages = computed<MessageGroup[]>(() => {
    if (!messages.value.length) return [];
    const groups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    for (const message of messages.value) {
        if (currentGroup && currentGroup.profile_id === message.profile_id) {
            currentGroup.messages.push(message);
        } else {
            if (currentGroup) groups.push(currentGroup);
            currentGroup = {
                profile_id: message.profile_id,
                profile: message.profiles || null,
                messages: [message]
            };
        }
    }
    if (currentGroup) groups.push(currentGroup);
    return groups;
});


// =======================================================================
// ======================== FUNÇÕES PRINCIPAIS (LÓGICA) ==================
// =======================================================================

// --- Funções de Busca (Fetch) ---
const fetchChannels = async () => {
    if (!loggedInUser.value) return;
    try {
        const userId = loggedInUser.value.id;
        const finalChannels = new Map<number, Channel>();

        const { data: createdChannels, error: createdError } = await supabase
            .from('channels')
            .select('*')
            .eq('created_by', userId)
            .eq('is_deleted', false);

        if (createdError) throw createdError;
        createdChannels.forEach(channel => finalChannels.set(channel.id, channel));

        const { data: memberEntries, error: memberError } = await supabase
            .from('channel_members')
            .select('channel_id')
            .eq('profile_id', userId);

        if (memberError) throw memberError;

        const memberChannelIds = memberEntries.map(m => m.channel_id);
        if (memberChannelIds.length > 0) {
            const { data: memberChannels, error: channelsError } = await supabase
                .from('channels')
                .select('*')
                .in('id', memberChannelIds)
                .eq('is_deleted', false);

            if (channelsError) throw channelsError;
            memberChannels.forEach(channel => finalChannels.set(channel.id, channel));
        }

        channels.value = Array.from(finalChannels.values());

    } catch (e: any) {
        console.error('Erro ao buscar canais:', e);
        channels.value = [];
    }
};

const fetchAuditChannels = async () => {
    try {
        const { data, error } = await supabase.from('admin_channels').select('*');
        if (error) throw error;
        auditChannels.value = data || [];
    } catch (e: any) { console.error('Erro ao buscar canais de auditoria:', e); }
};

const fetchMessages = async (channelId: number) => {
    try {
        const tableToQuery = isAuditorMode.value ? 'admin_messages' : 'messages';
        const { data, error } = await supabase
            .from(tableToQuery)
            .select('*, profiles(id, full_name, avatar_url, role)')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        const processedMessages = await Promise.all((data || []).map(async message => {
            if ((message.message_type === 'image' || message.message_type === 'file') && message.content) {
                const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(message.content);
                return { ...message, display_content: publicUrlData.publicUrl || message.content };
            }
            return { ...message, display_content: message.content };
        }));
        messages.value = processedMessages;
        scrollToBottom();
    } catch (e: any) { console.error('Erro ao buscar mensagens:', e); }
};

const fetchActiveChannelMembers = async (channelId: number) => {
    if (isAuditorMode.value || !channelId) {
        activeChannelMembers.value = [];
        return;
    }
    try {
        const { data, error } = await supabase
            .from('channel_members')
            .select('profiles(*)')
            .eq('channel_id', channelId);

        if(error) throw error;
        activeChannelMembers.value = data.map((item: any) => item.profiles) || [];
    } catch(e: any) {
        console.error('Erro ao buscar membros do canal:', e);
        activeChannelMembers.value = [];
    }
}

const fetchActiveChannelMedia = async (channelId: number) => {
    if (!channelId) {
        activeChannelMedia.value = [];
        return;
    }
     try {
        const tableToQuery = isAuditorMode.value ? 'admin_messages' : 'messages';
        const { data, error } = await supabase
            .from(tableToQuery)
            .select('*, profiles(id, full_name, avatar_url, role)')
            .eq('channel_id', channelId)
            .in('message_type', ['image', 'file'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        const processedMedia = await Promise.all((data || []).map(async message => {
            if (message.content) {
                const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(message.content);
                return { ...message, display_content: publicUrlData.publicUrl || message.content };
            }
            return message;
        }));
        activeChannelMedia.value = processedMedia;
    } catch(e: any) {
        console.error('Erro ao buscar mídias do canal:', e);
        activeChannelMedia.value = [];
    }
}


// --- Funções de Seleção e Navegação ---
const selectChannel = async (channel: Channel) => {
    activeChannel.value = channel;
    messages.value = [];
    activeChannelMembers.value = [];
    activeChannelMedia.value = [];
    unreadMessageCounts.value.set(channel.id, 0);

    if (channel.type === 'dm') {
        selectedDirectMessageUser.value = getDmUser(channel) || null;
    } else {
        selectedDirectMessageUser.value = null;
    }

    if(isMobile.value) {
        leftDrawer.value = false; // Fecha a sidebar esquerda ao selecionar um canal no mobile
    }
    rightDrawer.value = false;

    await Promise.all([
        fetchMessages(channel.id),
        fetchActiveChannelMembers(channel.id),
        fetchActiveChannelMedia(channel.id)
    ]);
};

const selectAuditChannel = async (channel: Channel) => {
    activeChannel.value = channel;
    selectedDirectMessageUser.value = null;
    messages.value = [];
    if(isMobile.value) {
        leftDrawer.value = false;
    }
    await fetchMessages(channel.id);
};

const startNewDirectMessage = async (user: Profile) => {
    if (!loggedInUser.value || user.id === loggedInUser.value.id) return;
    try {
        const { data: dmChannelData, error: rpcError } = await supabase.rpc('find_or_create_dm_channel', {
            p_user1_id: loggedInUser.value.id,
            p_user2_id: user.id
        });
        if (rpcError) throw rpcError;

        const existingChannel = channels.value.find(c => c.id === dmChannelData.id);
        if(!existingChannel) {
             await fetchChannels();
        }

        const finalChannel = channels.value.find(c => c.id === dmChannelData.id);
        if(finalChannel) {
            leftSidebarTab.value = 'dms';
            await selectChannel(finalChannel);
        }
    } catch (e: any) { console.error('Erro ao iniciar DM:', e); }
};


// --- Funções de Mensagens (CRUD) ---
const handleSendMessage = async (fileUrl: string | null = null, messageType: 'user' | 'image' | 'file' = 'user') => {
    const targetChannelId = activeChannel.value?.id;
    if ((!newMessage.value.trim() && !fileUrl) || !targetChannelId || !loggedInUser.value || isAuditorMode.value) return;

    try {
        const messageContent = fileUrl || newMessage.value;
        await supabase.from('messages').insert({
            content: messageContent,
            profile_id: loggedInUser.value.id,
            channel_id: targetChannelId,
            message_type: messageType
        });
        newMessage.value = '';
        scrollToBottom(true);
    } catch (e: any) { console.error('Erro ao enviar mensagem:', e); }
};

const uploadFileAndSendMessage = async (file: File, messageType: 'image' | 'file') => {
    if (!activeChannel.value || !loggedInUser.value) return;
    const filePath = `chat_media/${activeChannel.value.id}/${loggedInUser.value.id}/${Date.now()}-${file.name}`;
    try {
        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
        await handleSendMessage(filePath, messageType);
    } catch (error: any) { console.error("Erro ao enviar arquivo:", error); }
};


// --- Funções de Canal (CRUD) ---
const handleCreateChannel = async () => {
    if (!newChannelName.value.trim() || !loggedInUser.value) return alert('O nome do grupo é obrigatório.');
    isCreatingChannel.value = true;
    try {
        let iconUrl: string | null = null;
        if (selectedIconFile.value) {
            const file = selectedIconFile.value;
            const filePath = `channel_icons/${loggedInUser.value.id}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('media').getPublicUrl(filePath);
            iconUrl = data.publicUrl;
        }
        const { data: newChannel, error: channelError } = await supabase.from('channels').insert({
            name: newChannelName.value,
            description: newChannelDescription.value,
            created_by: loggedInUser.value.id,
            icon: newChannelIcon.value,
            icon_image_url: iconUrl,
            type: 'group'
        }).select().single();
        if (channelError) throw channelError;

        const membersToInsert = newChannelMembers.value.map(userId => ({ channel_id: newChannel.id, profile_id: userId }));
        membersToInsert.push({ channel_id: newChannel.id, profile_id: loggedInUser.value.id });

        if (membersToInsert.length > 0) {
            const { error: memberError } = await supabase.from('channel_members').insert(membersToInsert);
            if (memberError) throw memberError;
        }

        closeDialog('create');
        await fetchChannels();
        await selectChannel(newChannel);
    } catch (error: any) { console.error('Erro ao criar o canal:', error);
    } finally { isCreatingChannel.value = false; }
};

// --- Funções de Fundo ---
const startBackgroundCarousel = () => {
    stopBackgroundCarousel();
    if (userPersonalBackground.value) {
        currentBackground.value = userPersonalBackground.value;
        return;
    }
    currentBackground.value = backgrounds.value[0];
    backgroundInterval = setInterval(() => {
        const currentIndex = backgrounds.value.indexOf(currentBackground.value);
        const nextIndex = (currentIndex + 1) % backgrounds.value.length;
        currentBackground.value = backgrounds.value[nextIndex];
    }, 15000);
};
const stopBackgroundCarousel = () => {
    clearInterval(backgroundInterval);
}
const handleBackgroundUpload = async () => {
    if (!selectedBackgroundImageFile.value || selectedBackgroundImageFile.value.length === 0 || !loggedInUser.value) return;
    isUploadingBackground.value = true;
    const file = selectedBackgroundImageFile.value[0];
    const filePath = `user_backgrounds/${loggedInUser.value.id}/${file.name}`;
    try {
        await supabase.storage.from('media').upload(filePath, file, { upsert: true });
        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
        if (!publicUrlData.publicUrl) throw new Error('URL pública não encontrada.');
        await supabase.from('profiles').update({ background_image_url: publicUrlData.publicUrl }).eq('id', loggedInUser.value.id);
        userPersonalBackground.value = publicUrlData.publicUrl;
        currentBackground.value = publicUrlData.publicUrl;
        stopBackgroundCarousel();
        closeBackgroundSettingsDialog();
    } catch (error: any) { console.error('Erro ao subir imagem de fundo:', error);
    } finally { isUploadingBackground.value = false; }
};
const removeBackgroundImage = async () => {
    if (!loggedInUser.value) return;
    isUploadingBackground.value = true;
    try {
        await supabase.from('profiles').update({ background_image_url: null }).eq('id', loggedInUser.value.id);
        userPersonalBackground.value = null;
        startBackgroundCarousel();
        closeBackgroundSettingsDialog();
    } catch (error: any) { console.error('Erro ao remover imagem de fundo:', error);
    } finally { isUploadingBackground.value = false; }
};


// --- Funções Auxiliares e de UI ---
const scrollToBottom = (smooth = false) => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTo({ top: messagesContainer.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        }
    });
};
const isMyMessage = (message: Message): boolean => { return message.profile_id === loggedInUser.value?.id; };
const formatTime = (timestamp: string) => { if (!timestamp) return ''; return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
const isUserOnline = (userId?: string) => { if (!userId) return false; return onlineUsers.value.includes(userId); };
const getDmUser = (channel: Channel): Profile | undefined => {
    if (channel.type !== 'dm' || !loggedInUser.value || !channel.dm_participant_ids) return undefined;
    const otherMemberId = channel.dm_participant_ids.find((id: string) => id !== loggedInUser.value?.id);
    return allUsers.value.find(user => user.id === otherMemberId);
};
const getFileNameFromPath = (path: string): string => { return path.split('/').pop()?.substring(14) || path; };

const triggerImageFileInput = () => { imageFileInput.value?.click(); };
const onImageFileSelected = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) uploadFileAndSendMessage(file, 'image');
};
const triggerDocFileInput = () => { docFileInput.value?.click(); };
const onDocFileSelected = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) uploadFileAndSendMessage(file, 'file');
};

const triggerChannelIconInput = () => { channelIconInput.value?.click(); }
const onChannelIconSelected = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
        selectedIconFile.value = file;
        imagePreviewUrl.value = URL.createObjectURL(file);
    }
};
const closeDialog = (type: string) => {
    if (type === 'create') {
        showCreateChannelDialog.value = false;
        newChannelName.value = '';
        newChannelDescription.value = '';
        newChannelMembers.value = [];
        selectedIconFile.value = null;
        imagePreviewUrl.value = null;
    }
};
const openCreateChannelDialog = () => { showCreateChannelDialog.value = true; };
const openBackgroundSettingsDialog = () => {
    userBackgroundImagePreview.value = userPersonalBackground.value;
    showBackgroundSettingsDialog.value = true;
};
const closeBackgroundSettingsDialog = () => {
    showBackgroundSettingsDialog.value = false;
    selectedBackgroundImageFile.value = [];
    userBackgroundImagePreview.value = null;
};

const openImageModal = (url: string, fileName: string, fileType: string) => {
    modalImageUrl.value = url;
    modalImageFileName.value = fileName;
    modalImageFileType.value = fileType;
    showImageModal.value = true;
};
const closeImageModal = () => { showImageModal.value = false; };

const handleSignOut = async () => {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
};

// --- Listeners e Ciclo de Vida ---
const setupListeners = () => {
    presenceChannel.value = supabase.channel('online_users', { config: { presence: { key: loggedInUser.value?.id } } })
        .on('presence', { event: 'sync' }, () => {
            const presenceState = presenceChannel.value?.presenceState();
            if (presenceState) onlineUsers.value = Object.keys(presenceState);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.value?.track({ user_id: loggedInUser.value?.id });
            }
        });

    messageListener.value = supabase.channel('all_messages_listener')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload: RealtimePostgresChangesPayload<Message>) => {
            const newMessage = payload.new as Message;
            if (activeChannel.value && newMessage.channel_id === activeChannel.value.id) {
                await fetchMessages(activeChannel.value.id);
            } else {
                 const currentCount = unreadMessageCounts.value.get(newMessage.channel_id) || 0;
                 unreadMessageCounts.value.set(newMessage.channel_id, currentCount + 1);
            }
        })
        .subscribe();
}
const removeListeners = () => {
    if (messageListener.value) supabase.removeChannel(messageListener.value);
    if (presenceChannel.value) supabase.removeChannel(presenceChannel.value);
}

onMounted(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    loggedInUser.value = user;

    if (isMobile.value && !activeChannel.value) {
        leftDrawer.value = true;
    }

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        userProfile.value = profile;

        userPersonalBackground.value = profile?.background_image_url || null;
        startBackgroundCarousel();

        const { data: allUsersData } = await supabase.from('profiles').select('*');
        allUsers.value = allUsersData || [];

        await fetchChannels();
        setupListeners();
    } else {
        startBackgroundCarousel();
    }
});

onUnmounted(() => {
    stopBackgroundCarousel();
    removeListeners();
});

watch(leftSidebarTab, (newTab) => {
    activeChannel.value = null;
    selectedDirectMessageUser.value = null;
    rightDrawer.value = false;
    if (newTab === 'audit' && auditChannels.value.length === 0) {
        fetchAuditChannels();
    }
});

watch(selectedBackgroundImageFile, (files) => {
    if (files && files.length > 0) {
        userBackgroundImagePreview.value = URL.createObjectURL(files[0]);
    } else {
        userBackgroundImagePreview.value = null;
    }
});

watch([activeChannel, isMobile], ([channel, mobile]) => {
  if (!channel && mobile) {
    leftDrawer.value = true;
  }
});

</script>

<style lang="scss">
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* As variáveis agora estão no container principal para garantir o escopo correto */
.app-container {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --bg-color-rgba: rgba(18, 18, 24, 0.6);
  --blur-intensity: 15px;
  --border-color-rgba: rgba(255, 255, 255, 0.1);
  --text-primary: #F0F2F5;
  --text-secondary: #A3A6AC;
  --text-tertiary: #6C727A;
  --hover-color-rgba: rgba(255, 255, 255, 0.08);
  --my-message-bubble-rgba: rgba(55, 58, 97, 0.85);
  --other-message-bubble-rgba: rgba(54, 57, 66, 0.85);

  /* Correção Principal: Garantir altura e fundo */
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: background-image 1.5s ease-in-out;
  overflow: hidden;
  font-family: var(--font-family);

  *:not(v-icon) {
    font-family: var(--font-family) !important;
  }
}

.glassmorphism-base {
  background-color: var(--bg-color-rgba) !important;
  backdrop-filter: blur(var(--blur-intensity));
  -webkit-backdrop-filter: blur(var(--blur-intensity));
  border: 1px solid var(--border-color-rgba);
  color: var(--text-primary);
}

/* ======================================================================= */
/* ======================== BARRAS LATERAIS (SIDEBARS) =================== */
/* ======================================================================= */

.left-sidebar, .right-sidebar {
  @extend .glassmorphism-base;
  border-radius: 0;
  display: flex;
  flex-direction: column;

  background: none; /* Remove o fundo padrão do v-navigation-drawer */
}
.left-sidebar { border-right: 1px solid var(--border-color-rgba); }
.right-sidebar { border-left: 1px solid var(--border-color-rgba); }

.sidebar-header {
  flex-shrink: 0;
}

.sidebar-content {
  flex-grow: 1;
  overflow-y: auto;
  scrollbar-width: thin;
}

.channel-item, .user-item {
  margin: 2px 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: var(--hover-color-rgba);
  }
  &.v-list-item--active {
    background-color: rgba(var(--v-theme-primary-rgb), 0.25) !important;
    border: 1px solid rgba(var(--v-theme-primary-rgb), 0.5);
    .v-list-item-title {
      color: rgb(var(--v-theme-primary)) !important;
    }
  }
}

.empty-list-notice {
    padding: 24px;
    text-align: center;
    color: var(--text-secondary);
}

/* ======================================================================= */
/* ======================= ÁREA CENTRAL DO CHAT ========================== */
/* ======================================================================= */



.chat-container, .empty-chat-area {
  @extend .glassmorphism-base;
  border-radius: 0;
  height: 100%;
  width: 100%;
  border-left: none;
  border-right: none;
}





/* GRUPOS DE MENSAGENS */
.message-group {
    padding: 8px 0;
    display: flex;
    flex-direction: column;
}
.my-message-group {
    align-items: flex-end;
}
.other-message-group {
    align-items: flex-start;
}

.message-avatar {
    margin: 0 12px;
}

.message-content-wrapper {
    max-width: 80%; // Aumenta um pouco para mobile
    display: flex;
    flex-direction: column;
    @media (min-width: 960px) {
      max-width: 70%; // Mantém o valor original para desktop
    }
}
.my-message-group .message-content-wrapper {
    align-items: flex-end;
}
.other-message-group .message-content-wrapper {
    align-items: flex-start;
}

.message-sender-name {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text-secondary);
    padding: 0 14px;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 18px;
  color: var(--text-primary);
  line-height: 1.45;
  word-wrap: break-word;
  margin-top: 4px;
  position: relative;
  width: fit-content;
  max-width: 100%; // Garante que a bolha não saia da tela
}
.my-bubble {
  background-color: var(--my-message-bubble-rgba);
  border-bottom-right-radius: 4px;
}
.other-bubble {
  background-color: var(--other-message-bubble-rgba);
  border-bottom-left-radius: 4px;
}
.deleted-admin-bubble {
  border: 1px dashed rgba(255, 82, 82, 0.4);
}
.highlighted-message {
  animation: highlight-fade 2.5s ease-out forwards;
}
@keyframes highlight-fade {
  0% { box-shadow: 0 0 15px rgba(255, 255, 0, 0.7); }
  100% { box-shadow: none; }
}

.deleted-message-content {
    font-style: italic;
    color: var(--text-tertiary);
}

.message-metadata {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 6px;
  user-select: none;
  font-size: 11px;
  color: var(--text-tertiary);
  .edited-indicator { margin-right: 6px; }
  .read-receipt { color: #4FC3F7; }
}

/* CONTEÚDO EMBUTIDO (IMAGEM, ARQUIVO) */
.message-image-container {
    cursor: pointer;
    border-radius: 12px;
    overflow: hidden;
    margin: -2px -6px;
}
.file-message-container {
    display: flex; align-items: center;
    padding: 8px;
    border-radius: 8px;
    background-color: rgba(0,0,0,0.2);
    .file-icon { font-size: 32px; color: var(--text-secondary); margin-right: 12px; }
    .file-info {
        display: flex; flex-direction: column;
        .file-name { color: var(--text-primary); font-weight: 600; text-decoration: none; &:hover { text-decoration: underline; } }
        .file-size { font-size: 12px; color: var(--text-tertiary); }
    }
}

.chat-input-container {
  border-top: 1px solid var(--border-color-rgba);
  :deep(.v-field) {
    background-color: rgba(0,0,0,0.2) !important;
    box-shadow: none !important;
  }
}

/* ======================================================================= */
/* ======================== COMPONENTES E DIÁLOGOS ======================= */
/* ======================================================================= */

.menu-card, .dialog-card {
    @extend .glassmorphism-base;
    border-radius: 12px !important;
}

.dialog-header { border-bottom: 1px solid var(--border-color-rgba); }
.dialog-footer { border-top: 1px solid var(--border-color-rgba); }

.media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
}
.media-item {
    cursor: pointer;
    border-radius: 8px !important;
    overflow: hidden;
    .media-image {
      transition: transform 0.2s ease-in-out;
      &:hover { transform: scale(1.1); }
    }
}
.file-placeholder {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    aspect-ratio: 1 / 1; background-color: rgba(0,0,0,0.2); padding: 8px; text-align: center;
    .file-placeholder-text { font-size: 11px; word-break: break-all; margin-top: 4px; color: var(--text-secondary); }
}

/* Estilo para abas */
:deep(.v-tab.v-tab) {
    color: var(--text-secondary);
}

:deep(.v-tab--selected) {
    color: var(--text-primary) !important;
}

/* COLE ESTE BLOCO NO LUGAR DAS REGRAS ACIMA */

.chat-area-wrapper {
  /* Este wrapper agora se torna o container flex principal para a área de chat */
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0; /* Correção importante para flexbox */
}

.chat-container {
  /* O container do chat também será um flexbox que preenche o wrapper */
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: 100%;
}

.chat-header {
  /* O cabeçalho não deve encolher ou crescer */
  flex-shrink: 0;
  /* (o resto dos seus estilos para .chat-header continua aqui) */
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color-rgba);
  padding: 0 16px;
  height: 65px;
}
.chat-header .chat-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}
.chat-header .chat-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
@media (max-width: 600px) {
  .chat-header {
    padding: 0 8px;
  }
  .chat-header .chat-title {
    font-size: 1rem;
  }
}


.messages-list {
  /* A lista de mensagens é a única que vai crescer e ter scroll */
  flex: 1 1 auto;
  overflow-y: auto;
  /* (o resto dos seus estilos para .messages-list continua aqui) */
  display: flex;
  flex-direction: column;
}

.chat-input-container {
  /* O campo de input também não deve encolher ou crescer */
  flex-shrink: 0;
  /* (o resto dos seus estilos para .chat-input-container continua aqui) */
  border-top: 1px solid var(--border-color-rgba);
}
.chat-input-container :deep(.v-field) {
  background-color: rgba(0, 0, 0, 0.2) !important;
  box-shadow: none !important;
}
/* FIM DO BLOCO PARA SUBSTITUIR */

.drawer-fab-bottom {
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
  border-radius: 18px !important;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background-color: rgba(18, 18, 24, 0.6) !important;
  border: 1px solid rgba(255,255,255,0.1);
}
</style>
