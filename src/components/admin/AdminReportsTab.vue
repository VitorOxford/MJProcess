<template>
  <v-card-text>
    <h3 class="text-h6 mb-4">Relatório de Atividade por Usuário</h3>
    <v-row align="center">
      <v-col cols="12" md="8">
        <v-autocomplete
          v-model="selectedUser"
          :items="allUsers"
          item-title="full_name"
          item-value="id"
          label="Selecionar Usuário"
          variant="outlined"
          dense
          hide-details
          prepend-inner-icon="mdi-account-search-outline"
        >
           <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :prepend-avatar="item.raw.avatar_url" :title="item.raw.full_name"></v-list-item>
            </template>
        </v-autocomplete>
      </v-col>
      <v-col cols="12" md="4">
        <v-btn @click="generateReport" :loading="loading" block height="48" variant="flat" color="primary" :disabled="!selectedUser">
          <v-icon start>mdi-cogs</v-icon>
          Gerar Relatório
        </v-btn>
      </v-col>
    </v-row>

    <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="50"></v-progress-circular>
        <p class="mt-4">Analisando dados do usuário...</p>
    </div>

    <div v-if="reportData" class="mt-6">
        <v-row>
            <v-col v-for="kpi in reportData.kpis" :key="kpi.label" cols="12" sm="4">
                <v-card variant="tonal">
                    <v-card-text class="text-center">
                        <div class="text-h4 font-weight-bold">{{ kpi.value }}</div>
                        <div class="text-caption">{{ kpi.label }}</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <h4 class="text-h6 mt-8 mb-4">Feed de Atividades Detalhado</h4>
         <v-data-table
          :headers="activityHeaders"
          :items="reportData.activity"
          class="bg-transparent"
          density="compact"
          items-per-page="15"
          :search="activitySearch"
        >
          <template v-slot:top>
             <v-text-field
                v-model="activitySearch"
                label="Filtrar atividades..."
                variant="outlined"
                dense
                hide-details
                class="mb-4"
              ></v-text-field>
          </template>
         <template v-slot:item.activity_timestamp="{ item }">
              <span class="text-no-wrap">{{ formatDate(item.activity_timestamp) }}</span>
          </template>
           <template v-slot:item.action_type="{ item }">
              <v-chip size="small" :color="getActionChip(item.action_type).color" label>{{ getActionChip(item.action_type).text }}</v-chip>
            </template>
             <template v-slot:item.description="{ item }">
              <div class="text-wrap">{{ item.description }}</div>
            </template>
        </v-data-table>
    </div>

    <div v-if="!loading && !reportData" class="text-center text-medium-emphasis py-16">
        <v-icon size="64" class="mb-4">mdi-file-chart-outline</v-icon>
        <p>Selecione um usuário para gerar um relatório completo de suas atividades.</p>
    </div>
  </v-card-text>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
type Profile = { id: string; full_name: string; avatar_url: string; };
type Activity = {
    activity_timestamp: string;
    action_type: string;
    description: string;
    metadata: object;
};
type ReportData = {
  kpis: { label: string, value: number }[];
  activity: Activity[];
};

// State
const allUsers = ref<Profile[]>([]);
const selectedUser = ref<string | null>(null);
const loading = ref(false);
const reportData = ref<ReportData | null>(null);
const activitySearch = ref('');
const activityHeaders = [
    { title: 'Data/Hora', key: 'activity_timestamp', width: '200px' },
    { title: 'Tipo de Ação', key: 'action_type', width: '200px' },
    { title: 'Descrição', key: 'description' },
];

const fetchUsers = async () => {
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
  allUsers.value = data || [];
};

const generateReport = async () => {
  if (!selectedUser.value) return;
  loading.value = true;
  reportData.value = null;

  try {
    const { data: activities, error } = await supabase.rpc('get_user_activity_report', {
      p_user_id: selectedUser.value,
    });
    if (error) throw error;

    const kpis = [
        { label: 'Ações em Pedidos', value: activities.filter(a => a.action_type !== 'CHAT_MESSAGE').length },
        { label: 'Mensagens Enviadas', value: activities.filter(a => a.action_type === 'CHAT_MESSAGE').length },
        { label: 'Total de Atividades', value: activities.length },
    ];

    reportData.value = { kpis, activity: activities };

  } catch(e) {
    console.error("Erro ao gerar relatório:", e);
    // Adicionar um feedback visual de erro para o usuário (v-alert)
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });

const getActionChip = (actionType: string) => {
   const types: Record<string, { text: string, color: string }> = {
    'STATUS_CHANGE': { text: 'Status do Pedido', color: 'blue' },
    'FILE_UPLOAD': { text: 'Upload de Arte', color: 'purple' },
    'COMMENT': { text: 'Comentário', color: 'orange' },
    'ORDER_CREATED': { text: 'Pedido Criado', color: 'green' },
    'CHAT_MESSAGE': { text: 'Mensagem no Chat', color: 'cyan' }
  };
  return types[actionType] || { text: actionType.replace(/_/g, ' '), color: 'grey' };
};

onMounted(fetchUsers);
</script>

<style scoped lang="scss">
.sub-tab-item { font-size: 0.9rem; text-transform: none; }
.cyan-link {
    color: #00BCD4;
    text-decoration: none;
    &:hover { text-decoration: underline; }
}
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background-color: rgba(30, 30, 35, 0.85);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.125);
}
</style>
