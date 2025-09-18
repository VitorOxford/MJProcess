<template>
  <div>
    <v-toolbar color="transparent">
      <v-toolbar-title class="font-weight-bold">Painel de Relatórios</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-menu v-model="dateMenu" :close-on-content-click="false" location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" prepend-icon="mdi-calendar" variant="tonal">
            {{ dateRangeText }}
          </v-btn>
        </template>
        <v-date-picker
          v-model="dates"
          range
          show-adjacent-months
          @update:model-value="applyDateFilter"
        ></v-date-picker>
      </v-menu>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Processando dados e gerando relatórios...</p>
    </div>

    <div v-else-if="error" class="pa-4">
      <v-alert type="error" prominent>{{ error }}</v-alert>
    </div>

    <div v-else-if="reportData">
      <v-tabs v-model="tab" color="primary" class="mb-4">
        <v-tab value="sales">Vendas</v-tab>
        <v-tab value="design">Design</v-tab>
        <v-tab value="production">Produção</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item value="sales">
            <v-row>
                <v-col cols="12" md="8">
                  <ChartCard title="Desempenho por Vendedor">
                    <template #actions>
                       <v-chip-group v-model="salesChartMetric" mandatory variant="outlined" density="compact">
                          <v-chip value="items_count" size="small">Itens</v-chip>
                          <v-chip value="total_meters" size="small">Metragem</v-chip>
                       </v-chip-group>
                    </template>
                    <Bar :data="salesBySellerChart" :options="chartOptions" />
                  </ChartCard>
                </v-col>
                <v-col cols="12" md="4"><ChartCard title="Top 5 Tecidos (Metragem)"><Doughnut :data="topFabricsChart" :options="doughnutOptions" /></ChartCard></v-col>
            </v-row>
        </v-window-item>

        <v-window-item value="design">
             <v-row>
                <v-col cols="12" md="8"><ChartCard title="Itens Finalizados por Designer"><Bar :data="designPerformanceChart" :options="chartOptions" /></ChartCard></v-col>
                <v-col cols="12" md="4">
                    <KpiCard
                        class="h-100"
                        title="Tempo Médio de Aprovação"
                        :value="`${(avgApprovalTime).toFixed(1)} horas`"
                        icon="mdi-clock-fast"
                        color="cyan"
                        subtitle="Desde a criação do item até a aprovação."
                    />
                </v-col>
             </v-row>
        </v-window-item>

        <v-window-item value="production">
            <v-row>
              <v-col cols="12" md="6"><ChartCard title="Metragem por Máquina"><Doughnut :data="productionByMachineChart" :options="doughnutOptions" /></ChartCard></v-col>
            </v-row>
        </v-window-item>
      </v-window>

      <div class="mt-8">
        <v-toolbar color="transparent">
           <v-toolbar-title class="font-weight-bold">Relatório Detalhado de Itens</v-toolbar-title>
           <v-spacer></v-spacer>
           <v-btn v-if="!showDetailedReport" color="white" variant="outlined" @click="showDetailedReport = true">Gerar Relatório Detalhado</v-btn>
           <v-btn v-if="showDetailedReport" color="primary" @click="exportToPdf" prepend-icon="mdi-file-pdf-box">Exportar PDF</v-btn>
        </v-toolbar>

        <v-expand-transition>
            <v-card v-if="showDetailedReport" class="dashboard-card mt-2">
                <v-row class="pa-4" dense>
                    <v-col cols="12" md="4">
                        <v-text-field v-model="search" label="Buscar..." variant="outlined" density="compact" hide-details clearable></v-text-field>
                    </v-col>
                    <v-col cols="12" md="4">
                         <v-select v-model="sellerFilter" :items="sellerList" label="Filtrar por Vendedor" variant="outlined" density="compact" hide-details clearable></v-select>
                    </v-col>
                    <v-col cols="12" md="4">
                         <v-select v-model="statusFilter" :items="statusList" label="Filtrar por Status" variant="outlined" density="compact" hide-details clearable></v-select>
                    </v-col>
                </v-row>
                <v-data-table
                :headers="headers"
                :items="filteredDetailedItems"
                class="bg-transparent" item-value="id" density="compact"
                :search="search" items-per-page="15"
                >
                <template #item.created_at="{ item }">{{ formatDate(item.created_at) }}</template>
                <template #item.quantity_meters="{ item }">{{ item.quantity_meters.toLocaleString('pt-BR') }}m</template>
                </v-data-table>
            </v-card>
        </v-expand-transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineAsyncComponent } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Bar = defineAsyncComponent(() => import('vue-chartjs').then(c => c.Bar));
const Doughnut = defineAsyncComponent(() => import('vue-chartjs').then(c => c.Doughnut));
const KpiCard = defineAsyncComponent(() => import('./KpiCard.vue'));
const ChartCard = defineAsyncComponent(() => import('./ChartCard.vue'));

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const userStore = useUserStore();
const loading = ref(true);
const error = ref<string | null>(null);
const reportData = ref<any>(null);
const search = ref('');
const tab = ref('sales');

const dateMenu = ref(false);
const dates = ref<Date[]>([subDays(new Date(), 30), new Date()]);
const showDetailedReport = ref(false);
const sellerFilter = ref(null);
const statusFilter = ref(null);
const salesChartMetric = ref('items_count');

const dateRangeText = computed(() => {
    if (dates.value && dates.value.length === 2) {
        return `${format(dates.value[0], 'dd/MM/yy')} - ${format(dates.value[1], 'dd/MM/yy')}`;
    }
    return 'Selecione um período';
});

const applyDateFilter = () => {
    if (dates.value && dates.value.length === 2) {
        dateMenu.value = false;
        fetchReportData();
    }
};

const headers = [
    { title: 'Pedido', key: 'order_number' }, { title: 'Cliente', key: 'customer_name' },
    { title: 'Vendedor', key: 'creator_name' }, { title: 'Tecido', key: 'fabric_type' },
    { title: 'Estampa', key: 'stamp_ref' }, { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Data', key: 'created_at' },
];

const chartOptions = { responsive: true, maintainAspectRatio: false, color: '#fff' };
const doughnutOptions = { ...chartOptions, plugins: { legend: { position: 'right' as const, labels: { color: '#fff' } }}};

const salesBySellerChart = computed(() => {
    const metric = salesChartMetric.value; // 'items_count' or 'total_meters'
    const labels = reportData.value?.sales_by_seller?.map((s: any) => s.seller) || [];
    const data = reportData.value?.sales_by_seller?.map((s: any) => s[metric]) || [];
    const label = metric === 'items_count' ? 'Itens Vendidos' : 'Metragem Vendida (m)';
    return { labels, datasets: [{ label, backgroundColor: '#42A5F5', data }]};
});

const topFabricsChart = computed(() => {
    const labels = reportData.value?.meters_by_fabric?.map((f: any) => f.fabric) || [];
    const data = reportData.value?.meters_by_fabric?.map((f: any) => f.meters) || [];
    return { labels, datasets: [{ backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#26A69A', '#AB47BC'], data }]};
});

const designPerformanceChart = computed(() => {
    const labels = reportData.value?.design_performance?.map((d: any) => d.designer) || [];
    const data = reportData.value?.design_performance?.map((d: any) => d.items_completed) || [];
    return { labels, datasets: [{ label: 'Itens Finalizados', backgroundColor: '#AB47BC', data }]};
});

const avgApprovalTime = computed(() => {
    const designers = reportData.value?.design_performance || [];
    if (!designers || designers.length === 0) return 0;
    const validEntries = designers.filter((d: any) => d.avg_hours_to_approval !== null);
    if (validEntries.length === 0) return 0;
    const totalAvg = validEntries.reduce((sum: number, d: any) => sum + d.avg_hours_to_approval, 0);
    return totalAvg / validEntries.length;
});

const productionByMachineChart = computed(() => {
    const labels = reportData.value?.production_by_machine?.map((p: any) => p.machine) || [];
    const data = reportData.value?.production_by_machine?.map((p: any) => p.meters) || [];
    return { labels, datasets: [{ backgroundColor: ['#00BCD4', '#FFC107'], data }]};
});

const sellerList = computed(() => {
    if (!reportData.value?.all_items_table) return [];
    return [...new Set(reportData.value.all_items_table.map((item: any) => item.creator_name))];
});
const statusList = computed(() => {
    if (!reportData.value?.all_items_table) return [];
    return [...new Set(reportData.value.all_items_table.map((item: any) => item.status))];
});

const filteredDetailedItems = computed(() => {
    if (!reportData.value?.all_items_table) return [];
    return reportData.value.all_items_table.filter((item: any) => {
        const sellerMatch = !sellerFilter.value || item.creator_name === sellerFilter.value;
        const statusMatch = !statusFilter.value || item.status === statusFilter.value;
        return sellerMatch && statusMatch;
    });
});

const fetchReportData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const [startDate, endDate] = dates.value;
    if (!startDate || !endDate) throw new Error("Período de datas inválido.");

    const { data, error: rpcError } = await supabase.rpc('get_comprehensive_report_data', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
    });
    if (rpcError) throw rpcError;
    reportData.value = data;
  } catch (e: any) {
    console.error("Erro ao gerar relatório:", e);
    error.value = `Falha ao buscar dados do relatório: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatDate = (dateString: string) => format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });

const exportToPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(`Relatório Detalhado de Itens - Período: ${dateRangeText.value}`, 14, 16);
    autoTable(doc, {
        head: [headers.map(h => h.title)],
        body: filteredDetailedItems.value.map((item: any) => [
            item.order_number, item.customer_name, item.creator_name,
            item.fabric_type, item.stamp_ref,
            item.quantity_meters.toLocaleString('pt-BR') + 'm',
            formatDate(item.created_at)
        ]),
        startY: 20,
    });
    doc.save(`relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
};

onMounted(fetchReportData);
</script>

<style scoped lang="scss">
.dashboard-card, .kpi-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 100%;
}
.kpi-card {
  backdrop-filter: blur(10px);
}
.dashboard-card {
   background-color: rgba(30,30,35,0.7);
}
</style>
