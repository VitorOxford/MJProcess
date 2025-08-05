import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
      },
      {
        path: 'pedidos',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'novo-pedido',
        name: 'NewOrder',
        component: () => import('@/views/sales/NewOrder.vue'),
        meta: { roles: ['vendedor', 'admin'] }
      },
      {
        path: 'design',
        name: 'DesignKanban',
        component: () => import('@/views/design/DesignKanban.vue'),
        meta: { roles: ['designer', 'admin'] }
      },
      {
        path: 'producao',
        name: 'ProductionKanban',
        component: () => import('@/views/production/ProductionKanban.vue'),
        meta: { roles: ['producao', 'admin'] }
      },
      {
        path: 'pedidos/:id/aprovar',
        name: 'ApproveOrder',
        component: () => import('@/views/orders/ApproveOrder.vue'),
        meta: { roles: ['vendedor', 'admin'] }
      },
      // --- ROTA DO CHAT DE VOLTA AO LUGAR CERTO ---
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/Chat.vue'),
      },
      // --- FIM DA ALTERAÇÃO ---
      {
        path: 'tasks',
        name: 'Tasks',
        component: () => import('@/views/Tasks.vue'),
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/views/Projects.vue'),
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/Admin.vue'),
        meta: { requiresAuth: true, roles: ['admin'] }
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  if (!userStore.isLoggedIn) {
    await userStore.fetchSession();
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiredRoles = to.meta.roles as string[] | undefined;

  if (requiresAuth && !userStore.isLoggedIn) {
    return next({ name: 'Login' });
  }

  if (to.name === 'Login' && userStore.isLoggedIn) {
    return next({ name: 'Home' });
  }

  if (requiredRoles && !requiredRoles.includes(userStore.profile?.role ?? '')) {
     console.warn(`Acesso negado. Rota ${to.path} exige as roles: ${requiredRoles}. Usuário tem a role: ${userStore.profile?.role}`);
     return next({ name: 'Home' });
  }

  next();
});

export default router;
