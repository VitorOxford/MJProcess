import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';

// Tipagem atualizada para incluir tudo que precisamos
export type Order = {
  id: string;
  status: string;
  quantity_meters: number;
  value: number;
  created_at: string;
  created_by: string;
  customer_name: string; // Adicionado
  stores: { // Adicionado para o nome da loja
    name: string;
  } | null;
};

export type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  user_id: string;
};

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    orders: [] as Order[],
    tasks: [] as Task[],
    loading: false,
    lastFetched: null as Date | null,
  }),

  getters: {
    // Getters de KPI (sem alteração)
    totalValueInProduction: (state) => {
      const productionStatuses = ['production_queue', 'in_printing', 'in_cutting'];
      return state.orders
        .filter(o => productionStatuses.includes(o.status))
        .reduce((sum, order) => sum + (order.value || 0), 0);
    },
    ordersInProduction: (state) => {
        const productionStatuses = ['production_queue', 'in_printing', 'in_cutting'];
        return state.orders.filter(o => productionStatuses.includes(o.status)).length;
    },
    ordersInDesign: (state) => {
        const designStatuses = ['design_pending', 'in_design', 'customer_approval', 'changes_requested', 'finalizing'];
        return state.orders.filter(o => designStatuses.includes(o.status)).length;
    },
    pendingTasks: (state) => (userId: string) => {
        return state.tasks.filter(t => t.user_id === userId && !t.is_completed);
    },
  },

  actions: {
    async fetchData() {
      if (this.lastFetched && (new Date().getTime() - this.lastFetched.getTime()) < 30000) {
        return;
      }

      this.loading = true;
      try {
        const [ordersResponse, tasksResponse] = await Promise.all([
          // ATUALIZADO: Busca todas as colunas de 'orders' e o nome da loja relacionada
          supabase.from('orders').select('*, stores(name)'),
          supabase.from('tasks').select('*'),
        ]);

        if (ordersResponse.error) throw ordersResponse.error;
        if (tasksResponse.error) throw tasksResponse.error;

        this.orders = ordersResponse.data as any[]; // Usamos 'any' temporariamente pois Supabase V2 infere tipos
        this.tasks = tasksResponse.data as Task[];
        this.lastFetched = new Date();

      } catch (error: any) {
        console.error('Erro ao buscar dados para o dashboard:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});
