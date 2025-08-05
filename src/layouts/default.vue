<template>
  <v-app>
    <div class="app-background-container" :style="{ backgroundImage: `url(${currentBackground})` }"></div>

    <audio ref="notificationSound" src="https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/sounds/notification.mp3" preload="auto"></audio>
    <audio ref="messageSound" src="https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/sounds/message.mp3" preload="auto"></audio>

    <v-app-bar v-if="isMobile" app color="rgba(20, 20, 25, 0.7)" density="compact" class="glassmorphism-app-bar">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="app-bar-title">
         <router-link :to="{ name: 'Home' }">
            <v-img src="@/assets/logo.png" max-height="30" contain></v-img>
         </router-link>
      </v-toolbar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      app
      :permanent="!isMobile"
      :temporary="isMobile"
      class="glassmorphism-sidebar"
    >
      <div class="drawer-flex-wrapper">
        <div class="d-flex justify-center align-center pa-4 mt-2 mb-6">
          <v-img src="@/assets/logo.png" max-height="50" contain class="animated-logo"></v-img>
        </div>

        <v-list dense nav class="pa-2 main-nav-list">
          <v-list-item
            v-for="item in navItems"
            :key="item.value"
            :prepend-icon="item.icon"
            :title="item.title"
            :value="item.value"
            :to="item.to"
            rounded="lg"
            class="nav-item"
          ></v-list-item>
        </v-list>

        <v-spacer></v-spacer>

        <div class="pa-2 quick-actions">

          <div class="d-flex justify-space-around align-center">
            <v-btn v-if="isAdmin" :to="{ name: 'Admin' }" icon variant="text" title="Painel Admin">
              <v-icon>mdi-security</v-icon>
            </v-btn>
            <v-btn :to="{ name: 'Chat' }" icon variant="text" title="Chat">
              <v-icon>mdi-forum-outline</v-icon>
            </v-btn>
            <v-menu
              v-model="notificationMenu"
              :close-on-content-click="false"
              location="top end"
              offset="10"
              @update:model-value="isBellRinging = false"
            >
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" icon variant="text" title="Notificações">
                  <v-badge :content="unreadNotifications" color="error" :model-value="unreadNotifications > 0" dot>
                    <v-icon :class="{ 'bell-ringing': isBellRinging }">mdi-bell-outline</v-icon>
                  </v-badge>
                </v-btn>
              </template>

              <v-card class="glassmorphism-card" min-width="350" max-width="400" max-height="500">
                <v-list class="notification-list">
                  <div v-if="notifications.length === 0" class="text-center text-grey pa-8">
                     <p>Nenhuma notificação recente</p>
                  </div>
                  <v-list-item
                      v-for="notification in notifications"
                      :key="notification.id"
                      :title="notification.content"
                      :subtitle="formatDate(notification.created_at)"
                      @click="handleNotificationClick(notification)"
                      :class="{ 'notification-read': notification.is_read }"
                      class="notification-item"
                  >
                    <template v-slot:prepend>
                      <v-icon :color="notification.is_read ? 'transparent' : 'primary'">mdi-circle-small</v-icon>
                    </template>
                  </v-list-item>
                </v-list>
                 <v-card-actions v-if="hasReadNotifications" class="notification-actions">
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="clearReadNotifications">Limpar Lidas</v-btn>
                </v-card-actions>
              </v-card>
            </v-menu>
          </div>
        </div>

        <div class="user-footer pa-3">
          <v-divider class="mb-3"></v-divider>
          <v-list-item lines="two" class="pa-1" v-if="profile">
            <template v-slot:prepend>
              <v-avatar :image="profile.avatar_url || ''" size="40"></v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold text-body-1">{{ profile.full_name || 'Usuário' }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ userStore.user?.email || '...' }}</v-list-item-subtitle>
          </v-list-item>
          <v-btn
            @click="handleLogout"
            block
            color="rgba(239, 83, 80, 0.8)"
            variant="flat"
            class="mt-3 logout-btn"
          >
            Sair
          </v-btn>
        </div>
      </div>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar
        v-model="showToast"
        :timeout="6000"
        color="rgba(30,30,35,0.9)"
        location="bottom right"
        class="toast-notification"
    >
        <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3">mdi-bell-ring</v-icon>
            <div>
                <strong>Nova Notificação</strong>
                <div>{{ toastMessage }}</div>
            </div>
        </div>
        <template v-slot:actions>
            <v-btn variant="text" @click="showToast = false">Fechar</v-btn>
        </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useDisplay } from 'vuetify';
import { supabase } from '@/api/supabase';
import { useRouter } from 'vue-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const router = useRouter();
const userStore = useUserStore();
const { profile, isAdmin } = storeToRefs(userStore);

const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);
const drawer = ref(!isMobile.value);

type Notification = {
  id: string; content: string; recipient_id: string | null; redirect_url: string | null; is_read: boolean; created_at: string;
};

const notificationSound = ref<HTMLAudioElement | null>(null);
const notifications = ref<Notification[]>([]);
const notificationMenu = ref(false);
const notificationListener = ref<RealtimeChannel | null>(null);
const isBellRinging = ref(false);
const showToast = ref(false);
const toastMessage = ref('');

const unreadNotifications = computed(() => notifications.value.filter(n => !n.is_read).length);
const hasReadNotifications = computed(() => notifications.value.some(n => n.is_read));

const allNavItems = [
  { icon: 'mdi-view-dashboard-outline', title: 'Dashboard', value: 'home', to: { name: 'Home' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-calendar-check-outline', title: 'Pedidos', value: 'orders-calendar', to: { name: 'Orders' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-plus-box-outline', title: 'Novo Pedido', value: 'new-order', to: { name: 'NewOrder' }, roles: ['vendedor', 'admin'] },
  { icon: 'mdi-palette-swatch-outline', title: 'Fila de Design', value: 'design-kanban', to: { name: 'DesignKanban' }, roles: ['designer', 'admin'] },
  { icon: 'mdi-factory', title: 'Produção', value: 'production-kanban', to: { name: 'ProductionKanban' }, roles: ['producao', 'admin'] },
  { icon: 'mdi-checkbox-marked-circle-outline', title: 'Tarefas', value: 'tasks', to: { name: 'Tasks' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
];

const navItems = computed(() => {
    if (!profile.value) return [];
    return allNavItems.filter(item => item.roles.includes(profile.value.role));
});

const handleLogout = async () => {
  if (notificationListener.value) {
    supabase.removeChannel(notificationListener.value);
  }
  await userStore.signOut();
  router.push({ name: 'Login' });
};

const backgrounds = ref([
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/1.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/2.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/3.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/4.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/5.jpg'
]);
const currentBackground = ref('');
let backgroundInterval: NodeJS.Timeout;

const startBackgroundCarousel = () => {
    clearInterval(backgroundInterval);
    if (backgrounds.value.length === 0) return;
    currentBackground.value = backgrounds.value[0];
    backgroundInterval = setInterval(() => {
        const currentIndex = backgrounds.value.indexOf(currentBackground.value);
        const nextIndex = (currentIndex + 1) % backgrounds.value.length;
        currentBackground.value = backgrounds.value[nextIndex];
    }, 15000);
};

const fetchNotifications = async () => {
    if (!userStore.user) return;
    try {
        const { data, error } = await supabase.from('notifications').select('*').or(`recipient_id.eq.${userStore.user.id},recipient_id.is.null`).order('created_at', { ascending: false }).limit(30);
        if (error) throw error;
        notifications.value = data || [];
    } catch (error) { console.error("Erro ao buscar notificações:", error); }
}

const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
            const index = notifications.value.findIndex(n => n.id === notification.id);
            if (index !== -1) notifications.value[index].is_read = true;
        } catch(error) { console.error("Erro ao marcar notificação como lida:", error); }
    }
    if (notification.redirect_url) { router.push(notification.redirect_url); }
};

const clearReadNotifications = () => {
    notifications.value = notifications.value.filter(n => !n.is_read);
};

const handleNewNotification = (payload: any) => {
    const newNotification = payload.new as Notification;
    notifications.value.unshift(newNotification);
    notificationSound.value?.play().catch(e => console.error("Erro ao tocar som:", e));
    toastMessage.value = newNotification.content;
    showToast.value = true;
    isBellRinging.value = true;
    setTimeout(() => { isBellRinging.value = false; }, 2000);
};

const setupNotificationListener = () => {
    if (!userStore.user) return;
    notificationListener.value = supabase.channel('public:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
            const newNotification = payload.new as Notification;
            if (newNotification.recipient_id === userStore.user?.id || newNotification.recipient_id === null) {
                handleNewNotification(payload);
            }
        })
        .subscribe();
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), "dd/MM/yy 'às' HH:mm", { locale: ptBR });
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await fetchNotifications();
    setupNotificationListener();
  }
  startBackgroundCarousel();
});

onUnmounted(() => {
  clearInterval(backgroundInterval);
  if (notificationListener.value) {
      supabase.removeChannel(notificationListener.value);
  }
});
</script>

<style lang="scss">
.app-background-container {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: -1;
  background-size: cover;
  background-position: center;
  transition: background-image 1.5s ease-in-out;
  filter: blur(8px);
  -webkit-filter: blur(8px);
  transform: scale(1.1);
}
.v-application, .v-application__wrap {
  background: transparent !important;
}
.glassmorphism-app-bar {
  background-color: rgba(20, 20, 25, 0.6) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.drawer-flex-wrapper { display: flex; flex-direction: column; height: 100%; }
.main-nav-list { flex: 1 1 auto; overflow-y: auto; }
.quick-actions, .user-footer { flex-shrink: 0; }
.glassmorphism-sidebar {
  background-color: rgba(20, 20, 25, 0.7) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
}
.app-bar-title {
  display: flex;
  align-items: center;
}
</style>
