import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/hub', // Rota para a nova tela central
    name: 'Hub',
    component: () => import('@/views/Hub.vue'),
    meta: { requiresAuth: true },
  },
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
        path: 'aprovar-pedidos',
        name: 'Approvals',
        component: () => import('@/views/Approvals.vue'),
        meta: { roles: ['vendedor', 'designer', 'admin'] }
      },
      {
        path: 'em-producao',
        name: 'InProduction',
        component: () => import('@/views/production/InProduction.vue'),
        meta: { roles: ['producao', 'admin'] }
      },
      {
        path: 'liberacao',
        name: 'Liberacao',
        component: () => import('@/views/production/Liberacao.vue'),
        meta: { roles: ['producao', 'admin'] }
      },
      {
        path: 'tabela-precos',
        name: 'PriceList',
        component: () => import('@/views/sales/PriceList.vue'),
        meta: { roles: ['vendedor', 'admin'] }
      },
      {
        path: 'estoque',
        name: 'Stock',
        component: () => import('@/views/Stock.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'didatico',
        name: 'Didatico',
        component: () => import('@/views/Didatico.vue'),
        meta: { roles: ['vendedor', 'admin'] }
      },
      {
        path: 'entrega',
        name: 'Delivery',
        component: () => import('@/views/Delivery.vue'),
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
        path: 'catalogo-estampas',
        name: 'StampCatalog',
        component: () => import('@/views/design/StampCatalog.vue'),
        meta: { roles: ['designer', 'admin'] } // Apenas designer e admin podem acessar
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
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/Chat.vue'),
      },
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

  // Redireciona para o Hub após o login, em vez de Home
  if (to.name === 'Login' && userStore.isLoggedIn) {
    return next({ name: 'Hub' });
  }

  // ===== INÍCIO DA CORREÇÃO: REMOÇÃO DO REDIRECIONAMENTO =====
  // O trecho de código abaixo foi removido para impedir o redirecionamento
  // indesejado do Dashboard para o Hub.
  /*
  if(to.path === '/' && from.name !== 'Hub' && userStore.isLoggedIn) {
    return next({name: 'Hub'})
  }
  */
  // ===== FIM DA CORREÇÃO =====

  if (requiredRoles && !requiredRoles.includes(userStore.profile?.role ?? '')) {
     console.warn(`Acesso negado. Rota ${to.path} exige as roles: ${requiredRoles}. Usuário tem a role: ${userStore.profile?.role}`);
     return next({ name: 'Hub' }); // Se o acesso for negado, volta para o Hub
  }

  next();
});

export default router;
