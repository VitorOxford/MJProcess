<template>
  <v-app @click.once="unlockAudio" @touchend.once="unlockAudio">
    <div class="background-container">
      <div class="logo-container">
        <v-img src="@/assets/logo.png" max-height="120" contain class="logo-with-glow"></v-img>
      </div>
      <div class="particles-overlay"></div>
    </div>

    <audio ref="notificationSound" src="https://cdn.shopify.com/s/files/1/0661/4574/6991/files/ding-101492.mp3?v=1755543134" preload="auto"></audio>
    <audio ref="alertSound" src="https://cdn.shopify.com/s/files/1/0661/4574/6991/files/new-notification-022-370046.mp3?v=1757327480" preload="auto" loop></audio>

    <transition name="toast-slide">
      <div v-if="showToast" :key="toastKey" class="custom-toast" :style="toastStyle">
        <div class="toast-content">
          <v-icon :color="toastContent.color" class="mr-4 toast-icon">{{ toastContent.icon }}</v-icon>
          <div class="toast-text">
            <strong>{{ toastContent.title }}</strong>
            <div>{{ toastContent.message }}</div>
          </div>
        </div>
      </div>
    </transition>

    <v-app-bar v-if="isMobile" app color="rgba(20, 20, 25, 0.7)" density="compact" class="glassmorphism-app-bar">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="app-bar-title">
         <router-link :to="{ name: 'Home' }">
            <v-img src="@/assets/logo.png" max-height="50" contain></v-img>
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
      <div class="d-flex justify-center align-center pa-4 mt-2 mb-6" style="flex-shrink: 0;">
        <v-img src="@/assets/logo.png" max-height="80" contain class="animated-logo"></v-img>
      </div>

      <v-list dense nav class="pa-2 main-nav-list">
        <v-list-item
          v-for="item in navItems"
          :key="item.value"
          :prepend-icon="item.icon"
          :to="item.to"
          rounded="lg"
          class="nav-item"
          :class="{
            'highlight-red': item.value === 'approvals',
            'highlight-green': item.value === 'delivery'
          }"
          @mouseenter="(event) => toggleHoverEffect(event, true, item.value)"
          @mouseleave="(event) => toggleHoverEffect(event, false, item.value)"
        >
          <v-list-item-title> {{ item.title }} </v-list-item-title>
        </v-list-item>
      </v-list>

      <div class="pa-2 quick-actions" style="flex-shrink: 0;">
        <div class="d-flex justify-space-around align-center">

           <v-menu location="top end" offset="10">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon variant="text">
                 <v-tooltip activator="parent" location="top">Hub de Sistemas</v-tooltip>
                <v-icon>mdi-apps</v-icon>
              </v-btn>
            </template>
            <v-card class="glassmorphism-card-dialog" width="300">
               <v-list class="bg-transparent" nav>

                 <v-list-item href="https://gestaoclick.com/login" target="_blank" class="py-2">
                    <template #prepend>
                      <v-avatar rounded="0" class="mr-4">
                         <v-img src="https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/gestaologo.png"></v-img>
                      </v-avatar>
                   </template>
                   <v-list-item-title class="font-weight-bold">GestãoClick</v-list-item-title>
                 </v-list-item>
               </v-list>
            </v-card>
          </v-menu>
          <v-btn v-if="isAdmin" :to="{ name: 'Admin' }" icon variant="text" title="Painel Admin">
            <v-icon>mdi-security</v-icon>
          </v-btn>
          <v-btn :to="{ name: 'Chat' }" icon variant="text" title="Chat" disabled>
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

            <v-card class="notifications-panel glassmorphism-card-dialog">
              <v-toolbar color="transparent" density="compact">
                <v-toolbar-title class="font-weight-bold">Notificações</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn v-if="notifications.length > 0" size="small" variant="text" @click="clearAllNotifications">Limpar Tudo</v-btn>
              </v-toolbar>

              <div class="notification-list-scroll">
                <div v-if="notifications.length === 0" class="empty-notifications">
                  <v-icon size="48" class="mb-2">mdi-check-all</v-icon>
                  <p>Nenhuma notificação nova.</p>
                </div>
                <v-list v-else class="bg-transparent py-0">
                  <v-list-item
                    v-for="notification in notifications"
                    :key="notification.id"
                    @click="handleNotificationClick(notification)"
                    class="notification-item"
                    lines="two"
                  >
                    <template v-slot:prepend>
                      <v-avatar :color="getNotificationDetails(notification).color" size="40">
                        <v-icon color="white">{{ getNotificationDetails(notification).icon }}</v-icon>
                      </v-avatar>
                    </template>

                    <v-list-item-title class="text-wrap font-weight-bold">{{ getNotificationDetails(notification).title }}</v-list-item-title>
                    <v-list-item-subtitle class="text-wrap">{{ getNotificationDetails(notification).message }}</v-list-item-subtitle>

                    <template v-slot:append>
                       <div class="d-flex flex-column align-end">
                          <span class="text-caption text-grey-lighten-1 mb-1">{{ formatDistance(notification.created_at) }}</span>
                          <v-btn icon="mdi-close" variant="text" size="x-small" @click.stop="dismissNotification(notification.id)"></v-btn>
                       </div>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </v-card>
          </v-menu>
        </div>
      </div>

      <div class="user-footer pa-3" style="flex-shrink: 0;">
        <v-divider class="mb-3"></v-divider>
        <v-list-item lines="two" class="pa-1" v-if="profile">
          <template v-slot:prepend>
            <v-avatar :image="profile.avatar_url || ''" size="40"></v-avatar>
          </template>
          <v-list-item-title class="font-weight-bold text-body-1">{{ profile.full_name || 'Usuário' }}</v-list-item-title>
          <v-list-item-subtitle class="text-caption">{{ userStore.user?.email || '...' }}</v-list-item-subtitle>
        </v-list-item>
        <v-btn @click="handleLogout" block color="rgba(239, 83, 80, 0.8)" variant="flat" class="mt-3 logout-btn">
          Sair
        </v-btn>
      </div>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>

    <LowStockAlertModal
      v-if="currentLowStockAlert"
      :show="showLowStockAlert"
      :alert="currentLowStockAlert"
      @close="dismissCurrentStockAlert"
    />

    <PendingApprovalAlertModal
      v-if="currentPendingApprovalAlert"
      :show="showPendingApprovalAlert"
      :title="currentPendingApprovalAlert.title"
      :message="currentPendingApprovalAlert.message"
      @close="handleGoToApproval"
    />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, reactive } from 'vue';
import { useDisplay } from 'vuetify';
import { supabase } from '@/api/supabase';
import { useRouter } from 'vue-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useUserStore } from '@/stores/user';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LowStockAlertModal from '@/components/LowStockAlertModal.vue';
import PendingApprovalAlertModal from '@/components/admin/PendingApprovalAlertModal.vue';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();
const { profile, isAdmin } = storeToRefs(userStore);
const { lowStockAlerts } = storeToRefs(appStore);
const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);
const drawer = ref(!isMobile.value);

type Notification = {
  id: string; content: string; recipient_id: string | null; redirect_url: string | null; is_read: boolean; created_at: string;
};

const notificationSound = ref<HTMLAudioElement | null>(null);
const alertSound = ref<HTMLAudioElement | null>(null);
const notifications = ref<Notification[]>([]);
const notificationMenu = ref(false);
const notificationListener = ref<RealtimeChannel | null>(null);
const isBellRinging = ref(false);

const showLowStockAlert = ref(false);
const currentLowStockAlert = computed(() => lowStockAlerts.value.length > 0 ? lowStockAlerts.value[0] : null);

const showPendingApprovalAlert = ref(false);
const currentPendingApprovalAlert = ref<{title: string, message: string, redirectUrl: string | null} | null>(null);


const showToast = ref(false);
const toastKey = ref(0);
const toastContent = reactive({ title: '', message: '', icon: '', color: '' });
const toastStyle = ref({});
let toastTimeout: NodeJS.Timeout;
const isAudioUnlocked = ref(false);

// ===== INÍCIO DA ALTERAÇÃO: LÓGICA PARA ACESSAR SISTEMAS EXTERNOS =====
const loadingFinanceToken = ref(false);
const handleGoToFinance = async () => {
  loadingFinanceToken.value = true;
  try {
    const { data, error } = await supabase.functions.invoke('generate-finance-token');
    if (error) throw error;
    if (data.token) {
      const financeUrl = `https://mj-financeiro.onrender.com?token=${data.token}`;
      window.open(financeUrl, '_blank');
    } else {
        throw new Error('Token não recebido da função.');
    }
  } catch (error: any) {
    console.error('Erro ao gerar token para o sistema financeiro:', error);
    // Opcional: mostrar um snackbar de erro
  } finally {
    loadingFinanceToken.value = false;
  }
};
// ===== FIM DA ALTERAÇÃO =====

watch(lowStockAlerts, (newAlerts) => {
  if (newAlerts.length > 0 && !showLowStockAlert.value) {
    showLowStockAlert.value = true;
    if (alertSound.value && isAudioUnlocked.value) {
      alertSound.value.play().catch(e => console.error("Erro ao tocar som de alerta:", e));
    }
  }
}, { deep: true });

const dismissCurrentStockAlert = () => {
  if (currentLowStockAlert.value) {
    appStore.dismissAlert(currentLowStockAlert.value.id);
  }
  if (alertSound.value) {
    alertSound.value.pause();
    alertSound.value.currentTime = 0;
  }
  showLowStockAlert.value = false;
};


const unlockAudio = async () => {
  if (isAudioUnlocked.value) return;
  try {
    if (notificationSound.value) {
      await notificationSound.value.play();
      notificationSound.value.pause();
      notificationSound.value.currentTime = 0;
    }
    if (alertSound.value) {
      await alertSound.value.play();
      alertSound.value.pause();
      alertSound.value.currentTime = 0;
    }
    isAudioUnlocked.value = true;
  } catch (error) {
    // A interação do usuário desbloqueará o áudio
  }
};

const unreadNotifications = computed(() => notifications.value.filter(n => !n.is_read).length);

const allNavItems = [
  { icon: 'mdi-view-dashboard-outline', title: 'Dashboard', value: 'home', to: { name: 'Home' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-check-decagram-outline', title: 'Aprovar Pedidos', value: 'approvals', to: { name: 'Approvals' }, roles: ['vendedor', 'designer', 'admin'] },
  { icon: 'mdi-plus-box-outline', title: 'Novo Pedido', value: 'new-order', to: { name: 'NewOrder' }, roles: ['vendedor', 'admin'] },
  { icon: 'mdi-rocket-launch-outline', title: 'Lançamentos', value: 'orders-calendar', to: { name: 'Orders' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-clipboard-check-outline', title: 'Liberação', value: 'liberacao', to: { name: 'Liberacao' }, roles: ['producao', 'admin'] },
  { icon: 'mdi-cog-sync-outline', title: 'Em Produção', value: 'in-production', to: { name: 'InProduction' }, roles: ['producao', 'admin'] },
  { icon: 'mdi-palette-swatch-outline', title: 'Design', value: 'design-kanban', to: { name: 'DesignKanban' }, roles: ['designer', 'admin'] },
  { icon: 'mdi-image-multiple-outline', title: 'Catálogo de Estampas', value: 'stamp-catalog', to: { name: 'StampCatalog' }, roles: ['designer', 'admin'] },
  { icon: 'mdi-truck-delivery-outline', title: 'Agenda de Entrega', value: 'delivery', to: { name: 'Delivery' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-currency-usd', title: 'Tabela de Preços', value: 'price-list', to: { name: 'PriceList' }, roles: ['vendedor', 'admin'] },
  { icon: 'mdi-warehouse', title: 'Estoque', value: 'stock', to: { name: 'Stock' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-school-outline', title: 'Treinamento', value: 'didatico', to: { name: 'Didatico' }, roles: ['vendedor', 'admin'] },
  { icon: 'mdi-checkbox-marked-circle-outline', title: 'Tarefas', value: 'tasks', to: { name: 'Tasks' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
];

const navItems = computed(() => {
    if (!profile.value) return [];
    return allNavItems.filter(item => item.roles.includes(profile.value.role));
});

const toggleHoverEffect = (event: MouseEvent, shouldAdd: boolean, value: string) => {
  const target = event.currentTarget as HTMLElement;
  if (value === 'approvals' || value === 'delivery') {
    target.classList.toggle('hover-effect', shouldAdd);
  }
};

const getNotificationDetails = (notification: Notification) => {
    const content = notification.content; // Não converter para minúsculas para preservar o alerta
    if (content.startsWith('[ALERT_PENDING_APPROVAL]')) {
        const parts = content.replace('[ALERT_PENDING_APPROVAL]', '').split('::');
        return { title: parts[0] || 'Alerta', message: parts[1] || 'Aprovação pendente.', icon: 'mdi-alert-decagram', color: 'warning' };
    }
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('alteração solicitada')) {
        return { title: 'Alteração Solicitada', message: notification.content, icon: 'mdi-alert-circle-outline', color: 'error' };
    }
    if (lowerContent.includes('pronta para sua aprovação')) {
        return { title: 'Aprovação Necessária', message: notification.content, icon: 'mdi-send-check-outline', color: 'orange' };
    }
    if (lowerContent.includes('novo lançamento')) {
        return { title: 'Novo Lançamento', message: notification.content, icon: 'mdi-plus-box-outline', color: 'info' };
    }
    if (lowerContent.includes('aprovada pelo vendedor')) {
        return { title: 'Item Aprovado', message: notification.content, icon: 'mdi-check-all', color: 'success' };
    }
     if (lowerContent.includes('agendado para produção')) {
        return { title: 'Item Agendado', message: notification.content, icon: 'mdi-calendar-check', color: 'primary' };
    }
     if (lowerContent.includes('pronto para agendar a entrega')) {
        return { title: 'Pedido Finalizado', message: notification.content, icon: 'mdi-package-variant-closed-check', color: 'success' };
    }
    if (lowerContent.includes('nova tarefa')) {
        return { title: 'Nova Tarefa', message: notification.content, icon: 'mdi-checkbox-marked-circle-outline', color: 'primary' };
    }
    return { title: 'Notificação', message: notification.content, icon: 'mdi-bell-outline', color: 'grey' };
};

const handleLogout = async () => {
  if (notificationListener.value) {
    supabase.removeChannel(notificationListener.value);
  }
  await userStore.signOut();
  router.push({ name: 'Login' });
};

const fetchNotifications = async () => {
    if (!userStore.user) return;
    try {
        const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
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
        } catch(error) { console.error("Erro ao marcar como lida:", error); }
    }
    await dismissNotification(notification.id);
    if (notification.redirect_url) {
        notificationMenu.value = false;
        router.push(notification.redirect_url);
    }
};

const dismissNotification = async (notificationId: string) => {
    if(!userStore.user) return;
    try {
        const { error } = await supabase
            .from('user_notification_dismissals')
            .insert({ user_id: userStore.user.id, notification_id: notificationId });
        if (error) throw error;
        notifications.value = notifications.value.filter(n => n.id !== notificationId);
    } catch (err) {
        console.error("Erro ao dispensar notificação:", err);
    }
};

const clearAllNotifications = async () => {
    if(!userStore.user) return;
    try {
        const dismissals = notifications.value.map(n => ({
            user_id: userStore.user!.id,
            notification_id: n.id
        }));
        if (dismissals.length === 0) return;
        const { error } = await supabase.from('user_notification_dismissals').insert(dismissals);
        if (error) throw error;
        notifications.value = [];
    } catch (err) {
        console.error("Erro ao limpar notificações:", err);
    }
};

const handleNewNotification = (payload: any) => {
    const newNotification = payload.new as Notification;

    if (newNotification.content.startsWith('[ALERT_PENDING_APPROVAL]')) {
        const parts = newNotification.content.replace('[ALERT_PENDING_APPROVAL]', '').split('::');
        currentPendingApprovalAlert.value = {
            title: parts[0] || 'Aprovação Pendente',
            message: parts[1] || 'Um pedido requer sua atenção.',
            redirectUrl: newNotification.redirect_url
        };
        showPendingApprovalAlert.value = true;
        if (alertSound.value && isAudioUnlocked.value) {
            alertSound.value.play().catch(e => console.error("Erro ao tocar som de alerta:", e));
        }
        return;
    }

    notifications.value.unshift(newNotification);

    const details = getNotificationDetails(newNotification);
    toastContent.title = details.title;
    toastContent.message = details.message;
    toastContent.icon = details.icon;
    toastContent.color = details.color;
    toastStyle.value = { '--pulse-color': `var(--v-theme-${details.color})` };

    toastKey.value++;
    showToast.value = true;
    isBellRinging.value = true;
    setTimeout(() => { isBellRinging.value = false; }, 2000);

    if (notificationSound.value && isAudioUnlocked.value) {
      notificationSound.value.currentTime = 0;
      notificationSound.value.play().catch(e => console.error("Erro ao tocar som:", e));
    }

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        showToast.value = false;
    }, 6000);
};

const handleGoToApproval = () => {
  if (currentPendingApprovalAlert.value?.redirectUrl) {
    router.push(currentPendingApprovalAlert.value.redirectUrl);
  }
  showPendingApprovalAlert.value = false;
  currentPendingApprovalAlert.value = null;
  if (alertSound.value) {
    alertSound.value.pause();
    alertSound.value.currentTime = 0;
  }
};

const setupNotificationListener = () => {
    if (!userStore.user || notificationListener.value) return;

    notificationListener.value = supabase.channel('public:notifications')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
                const newNotification = payload.new as Notification;
                const isForAll = newNotification.recipient_id === null;
                const isForMe = newNotification.recipient_id === userStore.user?.id;

                if (isForAll || isForMe) {
                    const isDismissed = notifications.value.some(n => n.id === newNotification.id);
                    if (!isDismissed) {
                        handleNewNotification(payload);
                    }
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`Conectado ao canal de notificações públicas com sucesso!`);
            } else if (status === 'CHANNEL_ERROR') {
                console.error(`Erro ao se conectar ao canal de notificações.`);
            }
        });
};

const formatDistance = (dateString: string) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: ptBR });
};

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await fetchNotifications();
    setupNotificationListener();
    appStore.checkInitialLowStock();
  }
});

onUnmounted(() => {
  if (notificationListener.value) {
      supabase.removeChannel(notificationListener.value);
      notificationListener.value = null;
  }
  clearTimeout(toastTimeout);
});
</script>

<style lang="scss">
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-color: #121212;
  background-image: radial-gradient(circle at center, rgba(0,0,0,0.8), #121212);
  display: flex;
  justify-content: center;
  align-items: center;
}
.v-application, .v-application__wrap {
  background: transparent !important;
}
.v-main {
  height: 100vh;
  overflow-y: auto;
}
.glassmorphism-sidebar {
  background-color: rgba(20, 20, 25, 0.7) !important;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
}
.v-navigation-drawer > .v-navigation-drawer__content {
  display: flex;
  flex-direction: column;
}
.main-nav-list {
  flex-grow: 1;
  overflow-y: auto;
}
.nav-item {
  position: relative;
  overflow: hidden;
  transition: background-color 0.2s ease;
}
.highlight-red {
  background-color: rgba(239, 83, 80, 0.733) !important;
  box-shadow: 0 0 8px rgba(239, 83, 80, 0.966);
}
.highlight-green {
  background-color: rgba(76, 175, 79, 0.658) !important;
  box-shadow: 0 0 8px rgb(76, 175, 79);
}
.nav-item.hover-effect {
  background-image: linear-gradient(45deg, transparent 10%, var(--hover-color) 50%, transparent 90%);
  background-size: 300% 100%;
  animation: gradient-animation 1.5s infinite linear;
}
.highlight-red.hover-effect {
  --hover-color: rgba(239, 83, 80, 0.993);
}
.highlight-green.hover-effect {
  --hover-color: rgba(76, 175, 79, 0.973);
}
@keyframes gradient-animation {
  0% { background-position: 200% 0; }
  100% { background-position: -100% 0; }
}
.bell-ringing {
  animation: ring 1.5s ease-in-out infinite;
}
@keyframes ring {
  0% { transform: rotate(0); } 10% { transform: rotate(25deg); } 20% { transform: rotate(-25deg); }
  30% { transform: rotate(20deg); } 40% { transform: rotate(-20deg); } 50% { transform: rotate(15deg); }
  60% { transform: rotate(-15deg); } 70% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); }
  90%, 100% { transform: rotate(0); }
}
.custom-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background-color: rgba(30, 30, 35, 0.85);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  padding: 16px;
  min-width: 350px;
  max-width: 90%;
  color: white;
  display: flex;
  align-items: center;
  pointer-events: all;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 12px;
    box-shadow: 0 0 15px 3px var(--pulse-color, transparent);
    animation: pulse-glow 2s infinite ease-in-out;
    pointer-events: none;
    opacity: 0.8;
  }
}
.toast-content {
  display: flex;
  align-items: center;
  width: 100%;
}
.toast-icon {
  font-size: 28px;
}
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  transform: translate(-50%, -150%);
  opacity: 0;
}
@keyframes pulse-glow {
  0% { box-shadow: 0 0 10px 2px var(--pulse-color, transparent); opacity: 0.7; }
  50% { box-shadow: 0 0 25px 8px var(--pulse-color, transparent); opacity: 1; }
  100% { box-shadow: 0 0 10px 2px var(--pulse-color, transparent); opacity: 0.7; }
}
.notifications-panel {
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
}
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(40, 40, 45, 0.85) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.notification-list-scroll {
  flex-grow: 1;
  overflow-y: auto;
  max-height: 50vh;
}
.notification-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  &:last-child {
    border-bottom: none;
  }
  .v-list-item-subtitle {
    white-space: normal;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    display: -webkit-box;
    overflow: hidden;
  }
}
.empty-notifications {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 200px;
  color: #757575;
}
.v-navigation-drawer.glassmorphism-sidebar {
  display: flex !important;
  flex-direction: column !important;
  height: 100vh !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
.main-nav-list {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: 100% !important;
  overflow-y: auto !important;
  max-height: unset !important;
}

.v-list-item {
  .v-avatar {
    height: 36px !important; // Altura fixa para o avatar
    width: 36px !important;  // Largura fixa para o avatar
    min-width: 36px !important; // Garante que não encolha
    .v-img {
      object-fit: contain !important; // Garante que a imagem se ajuste dentro do avatar
      width: 100%;
      height: 100%;
    }
  }
}

.quick-actions {
  .v-list-item {
    min-height: 48px !important; // Garante altura mínima para cada item
  }
}

// Estilo específico para o modal do hub para evitar que a lista fique muito espaçada
.v-card.glassmorphism-card-dialog {
  .v-list-item {
    padding-left: 16px; // Ajusta o padding horizontal
    padding-right: 16px;
  }
  .v-list-item__prepend {
    align-self: center; // Centraliza o avatar verticalmente
  }
  .v-list-item-title {
    line-height: 1.2; // Ajusta o espaçamento da linha do título
  }
}
</style>
