<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="6" md="4">
        <v-card class="kpi-card text-center" color="rgba(255, 152, 0, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ itemsPendingSellerApprovalCount }}</div>
            <div class="text-subtitle-2 text-white-50">Itens para Aprovar</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card class="kpi-card text-center" color="rgba(3, 169, 244, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ myActiveLaunchOrders.length }}</div>
            <div class="text-subtitle-2 text-white-50">Meus Lançamentos Ativos</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="12" md="4">
         <v-card class="kpi-card text-center" color="rgba(156, 39, 176, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ totalLaunchOrdersCreated }}</div>
            <div class="text-subtitle-2 text-white-50">Total de Lançamentos Criados</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card class="dashboard-card mt-4" color="rgba(30,30,35,0.8)">
            <v-toolbar color="transparent">
                <v-tabs v-model="tab" color="primary">
                    <v-tab value="new">
                        <v-icon start>mdi-rocket-launch-outline</v-icon>
                        Dashboard Atual (Lançamentos)
                    </v-tab>
                    <v-tab value="legacy">
                        <v-icon start>mdi-history</v-icon>
                        Pedidos Legados
                    </v-tab>
                </v-tabs>
                 <v-spacer></v-spacer>
                 <v-btn
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-image-edit-outline"
                    class="mr-4"
                    @click="openEditor"
                    :loading="loadingEditorToken"
                  >
                    Editor de Imagens
                  </v-btn>
                 <v-btn :to="{ name: 'NewOrder' }" color="primary" variant="tonal" prepend-icon="mdi-plus-box-outline">
                    Lançar Pedido
                </v-btn>
            </v-toolbar>

            <v-alert v-if="editorError" type="error" closable @click:close="editorError = null" class="ma-4">
              {{ editorError }}
            </v-alert>

            <v-window v-model="tab">
                <v-window-item value="new">
                    <v-row class="pa-4">
                        <v-col cols="12" md="8">
                            <v-data-table
                                :headers="headers"
                                :items="myActiveLaunchOrders"
                                class="bg-transparent"
                                density="compact"
                                item-value="id"
                                no-data-text="Nenhum lançamento ativo encontrado."
                            >
                                <template v-slot:item.order_number="{ item }">
                                    <span class="font-weight-bold">#{{ String(item.order_number).padStart(4, '0') }}</span>
                                </template>
                                <template v-slot:item.status="{ value, item }">
                                  <v-chip v-if="value !== 'customer_approval'" size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] || value }}</v-chip>
                                  <v-btn v-else :to="{ name: 'ApproveOrder', params: { id: item.id } }" color="orange" size="small" variant="tonal">
                                      Aprovar Itens
                                  </v-btn>
                                </template>
                            </v-data-table>
                        </v-col>
                        <v-col cols="12" md="4">
                             <h3 class="text-h6 mb-4">Funil de Lançamentos</h3>
                             <div v-if="myActiveLaunchOrders.length > 0">
                                <div v-for="stage in salesFunnel" :key="stage.name" class="mb-4">
                                    <div class="d-flex justify-space-between mb-1">
                                        <span class="font-weight-bold">{{ stage.name }}</span>
                                        <span class="text-grey">{{ stage.count }} pedido(s)</span>
                                    </div>
                                    <v-progress-linear :model-value="stage.percentage" :color="stage.color" height="8" rounded></v-progress-linear>
                                </div>
                             </div>
                             <div v-else class="text-center text-grey mt-8">
                                Nenhum dado para exibir no funil.
                             </div>
                        </v-col>
                    </v-row>
                </v-window-item>

                <v-window-item value="legacy">
                     <div class="pa-4">
                        <p class="text-h6 mb-2">Pedidos do Sistema Antigo</p>
                        <p class="text-caption text-medium-emphasis mb-4">Esta visão mostra apenas os pedidos criados antes da implementação do sistema de Lançamentos.</p>
                        <v-data-table
                            :headers="legacyHeaders"
                            :items="myLegacyActiveOrders"
                            class="bg-transparent"
                            density="compact"
                            item-value="id"
                            no-data-text="Nenhum pedido legado ativo encontrado."
                        >
                            <template v-slot:item.status="{ value }">
                                <v-chip size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] || value }}</v-chip>
                            </template>
                        </v-data-table>
                     </div>
                </v-window-item>
            </v-window>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router'; // Importa o useRouter
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
import { supabase } from '@/api/supabase';

const dashboardStore = useDashboardStore();
const userStore = useUserStore();
const router = useRouter(); // Inicializa o router
const { itemsPendingSellerApprovalCount } = storeToRefs(dashboardStore);

const tab = ref('new');
const loadingEditorToken = ref(false);
const editorError = ref<string | null>(null);

const headers = [
  { title: 'Nº Pedido', key: 'order_number', width: '120px' },
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Status', key: 'status', width: '180px', align: 'end' },
];

const legacyHeaders = [
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Status', key: 'status' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'No Design', in_design: 'Em Design', changes_requested: 'Alteração Solicitada',
    finalizing: 'Finalizando Arte', customer_approval: 'Aguardando Aprovação',
    production_queue: 'Fila de Produção', in_printing: 'Em Impressão',
    in_cutting: 'Em Corte', completed: 'Finalizado'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', changes_requested: 'red',
    finalizing: 'purple', customer_approval: 'orange',
    production_queue: 'grey', in_printing: 'cyan', in_cutting: 'amber',
    completed: 'green'
};

const myOrders = computed((): Order[] => {
    if (!userStore.profile?.id) return [];
    return dashboardStore.orders.filter(o => o.created_by === userStore.profile.id);
});

const myLaunchOrders = computed(() => myOrders.value.filter(order => order.is_launch));
const myActiveLaunchOrders = computed(() => myLaunchOrders.value.filter(order => order.status !== 'completed'));

const myLegacyActiveOrders = computed(() => myOrders.value.filter(order => !order.is_launch && order.status !== 'completed'));

const totalOrdersCreated = computed(() => myOrders.value.length);
const totalLaunchOrdersCreated = computed(() => myLaunchOrders.value.length);

const salesFunnel = computed(() => {
    const activeLaunches = myActiveLaunchOrders.value;
    const total = activeLaunches.length;
    if (total === 0) return [];

    const designCount = activeLaunches.filter(o => ['design_pending', 'in_design', 'changes_requested', 'finalizing'].includes(o.status)).length;

    const approvalCount = activeLaunches.filter(o =>
        o.order_items.some(item => item.status === 'customer_approval')
    ).length;

    const productionCount = activeLaunches.filter(o => ['production_queue', 'in_printing', 'in_cutting'].includes(o.status)).length;

    return [
        { name: 'Em Design', count: designCount, percentage: (designCount / total) * 100, color: 'blue' },
        { name: 'Aguardando Aprovação', count: approvalCount, percentage: (approvalCount / total) * 100, color: 'orange' },
        { name: 'Em Produção', count: productionCount, percentage: (productionCount / total) * 100, color: 'purple' },
    ];
});

const openEditor = async () => {
  loadingEditorToken.value = true;
  editorError.value = null;
  try {
    const { error: sessionError } = await supabase.auth.refreshSession();

    // ---- INÍCIO DA CORREÇÃO ----
    // Se o refresh token for inválido, desloga o usuário
    if (sessionError) {
      alert('Sua sessão expirou. Por favor, faça login novamente.');
      await userStore.signOut();
      router.push({ name: 'Login' });
      return; // Interrompe a execução
    }
    // ---- FIM DA CORREÇÃO ----

    const { data, error } = await supabase.functions.invoke('generate-editor-token');
    if (error) throw error;

    if (data.token) {
      const editorUrl = `https://mjmockups.onrender.com?token=${data.token}`;
      window.open(editorUrl, '_blank');
    } else {
      throw new Error('Token de acesso ao editor não foi recebido.');
    }
  } catch (error: any) {
    console.error('Erro ao abrir o editor:', error);
    editorError.value = `Erro ao acessar o editor: ${error.message}`;
  } finally {
    loadingEditorToken.value = false;
  }
};

</script>

<style scoped lang="scss">
.kpi-card, .dashboard-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: 100%;
}
.kpi-card {
    border-left-width: 4px;
    border-left-color: currentColor;
}
:deep(.v-data-table__wrapper) {
    background-color: transparent !important;
}
</style>
