<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="1200px" persistent scrollable>
    <v-card class="glassmorphism-card-dialog">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">
          Itens do Pedido #{{ String(order?.order_number).padStart(4, '0') }}
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <v-card-text v-if="order">
        <div class="order-info-header">
          <div>
            <div class="text-caption text-grey">CLIENTE</div>
            <div class="text-h6 font-weight-bold">{{ order.customer_name }}</div>
          </div>
          <div>
            <div class="text-caption text-grey">VENDEDOR</div>
            <div class="text-h6">{{ order.creator_name }}</div>
          </div>
        </div>

        <div v-if="loadingItems" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-2 text-caption">Carregando todos os itens do pedido...</p>
        </div>

        <v-list v-else class="bg-transparent item-list">
          <template v-for="(item, index) in localItems" :key="item.id">
            <v-list-item class="item-row pa-4">
              <template #prepend>
                <v-img
                  :src="item.stamp_image_url"
                  class="item-thumbnail elevation-2"
                  aspect-ratio="1"
                  cover
                ></v-img>
              </template>

              <v-list-item-title class="font-weight-bold text-body-1">{{ item.stamp_ref }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.fabric_type }} - {{ formatMeters(item.quantity_meters) }}m</v-list-item-subtitle>

              <template #append>
                <div class="d-flex align-center ga-2 item-actions">
                  <v-chip
                    size="small"
                    :color="statusInfo(item).color"
                    :prepend-icon="statusInfo(item).icon"
                    variant="tonal"
                    class="font-weight-bold"
                    label
                  >
                    {{ statusInfo(item).text }}
                  </v-chip>

                  <v-chip
                    v-if="userStore.isAdmin"
                    :color="item.is_op_generated ? 'info' : 'grey'"
                    variant="tonal"
                    size="small"
                    label
                  >
                    OP
                    <v-icon end size="small">{{ item.is_op_generated ? 'mdi-check' : 'mdi-close' }}</v-icon>
                     <v-tooltip activator="parent" location="top">
                      {{ item.is_op_generated ? 'OP já foi gerada' : 'OP ainda não gerada' }}
                    </v-tooltip>
                  </v-chip>

                  <v-btn
                    v-if="item.is_op_generated"
                    icon
                    variant="text"
                    color="info"
                    size="small"
                    @click="generatePdf(item)"
                  >
                    <v-icon>mdi-file-pdf-box</v-icon>
                    <v-tooltip activator="parent" location="top">Gerar PDF da OP</v-tooltip>
                  </v-btn>
                  <v-btn
                    v-if="canReleaseItem(item)"
                    color="primary"
                    variant="flat"
                    @click="releaseItemForProduction(item)"
                    :loading="releasing[item.id]"
                  >
                    <v-icon start>mdi-send</v-icon>
                    Liberar
                  </v-btn>
                </div>
              </template>
            </v-list-item>
            <v-divider v-if="index < localItems.length - 1"></v-divider>
          </template>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps<{
  show: boolean;
  order: any | null;
}>();
const emit = defineEmits(['close', 'update-items']);

const userStore = useUserStore();
const releasing = reactive<Record<string, boolean>>({});
const localItems = ref<any[]>([]);
const loadingItems = ref(false);
const fullOrderDetails = ref<any | null>(null);

const statusInfo = (item: any) => {
    const status = item.status;
    const designTag = item.design_tag;

    const map: Record<string, { text: string, color: string, icon: string }> = {
        production_queue: { text: 'Na Fila', color: 'grey', icon: 'mdi-timer-sand' },
        completed: { text: 'Concluído', color: 'success', icon: 'mdi-check-circle' },
        in_printing: { text: 'Em Produção', color: 'primary', icon: 'mdi-cog-sync' },
        in_cutting: { text: 'Em Produção', color: 'primary', icon: 'mdi-cog-sync' },
        customer_approval: { text: 'Aprovação Vendedor', color: 'orange', icon: 'mdi-account-clock' },
        changes_requested: { text: 'Alteração Solicitada', color: 'error', icon: 'mdi-alert-circle' },
        approved_by_seller: { text: 'Aprovado', color: 'green-lighten-1', icon: 'mdi-check' },
        design_pending: {
            text: designTag || 'Em Design',
            color: {
                'Desenvolvimento': 'info',
                'Alteração': 'warning',
                'Finalização': 'teal',
                'Aprovado': 'success'
            }[designTag] || 'blue-grey',
            icon: 'mdi-palette'
        }
    };
    return map[status] || { text: status, color: 'default', icon: 'mdi-help-circle' };
};

const fetchFullOrderDetails = async (orderId: string) => {
  loadingItems.value = true;
  localItems.value = [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, created_by:profiles!created_by(full_name), order_items(*)')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    fullOrderDetails.value = data;
    localItems.value = data.order_items.sort((a: any, b: any) => a.id.localeCompare(b.id));

  } catch (err) {
    console.error("Erro ao buscar detalhes completos do pedido:", err);
  } finally {
    loadingItems.value = false;
  }
}

watch(() => props.show, (newVal) => {
    if (newVal && props.order) {
        fetchFullOrderDetails(props.order.id);
    } else {
        localItems.value = [];
        fullOrderDetails.value = null;
    }
}, { immediate: true });

const canReleaseItem = (item: any) => {
    return userStore.isAdmin && item.status === 'production_queue';
};

const releaseItemForProduction = async (item: any) => {
    if(!confirm(`Tem certeza que deseja liberar o item "${item.stamp_ref}" para a produção? A data de início será resetada para HOJE.`)) return;

    releasing[item.id] = true;
    try {
        const { error: rpcError } = await supabase.rpc('release_item_to_production_v2', {
          p_item_id: item.id
        });

        if (rpcError) throw rpcError;

        const foundItem = localItems.value.find(i => i.id === item.id);
        if (foundItem) {
            foundItem.status = 'in_printing';
        }

        emit('update-items');

    } catch (err: any) {
        console.error("Erro ao liberar item para produção:", err);
        alert(`Falha ao liberar o item: ${err.message}`);
    } finally {
        releasing[item.id] = false;
    }
};

const formatMeters = (meters: number) => Number(meters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

const imageToBase64 = (url: string): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        } else { reject(new Error('Contexto do canvas não obtido')); }
    };
    img.onerror = reject;
    img.src = url;
});

const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) addedDays++;
  }
  return newDate;
};

const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        if ([2, 4, 6].includes(newDate.getDay())) return newDate;
        newDate.setDate(newDate.getDate() + 1);
    }
};

const generatePdf = async (item: any) => {
  const parentOrder = fullOrderDetails.value;
  if (!parentOrder) {
      alert("Os detalhes completos do pedido ainda estão carregando. Tente novamente em um instante.");
      return;
  }

  try {
    const { data: opNumber, error: rpcError } = await supabase.rpc('generate_op_number', { p_item_id: item.id });
    if (rpcError) throw rpcError;

    const { data: schedule, error: scheduleError } = await supabase.from('production_schedule').select('scheduled_date').eq('order_item_id', item.id).single();
    if (scheduleError || !schedule) throw new Error('Agendamento do item não encontrado.');

    const completionDate = addBusinessDays(parseISO(schedule.scheduled_date), 3);
    const forecastDate = getNextDeliveryDay(completionDate);
    const formattedOpNumber = String(opNumber).padStart(4, '0');
    const formattedForecastDate = format(forecastDate, 'dd/MM/yyyy', { locale: ptBR });
    const formattedOrderNumber = String(parentOrder.order_number).padStart(4, '0');

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    const [logoBase64, artBase64] = await Promise.all([
      imageToBase64('https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713'),
      imageToBase64(item.stamp_image_url || '')
    ]);

    const logoProps = doc.getImageProperties(logoBase64);
    const logoWidth = 50;
    const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
    doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);

    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(["MR JACKY - 20.631.721/0001-07", "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000", "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"], pageWidth - 15, 15, { align: 'right' });

    doc.setFontSize(18); doc.setTextColor(0); doc.text(`OP #${formattedOpNumber}`, 15, 45);
    doc.setFontSize(12); doc.text(`Pedido #${formattedOrderNumber}`, pageWidth - 15, 45, { align: 'right' });
    doc.setLineWidth(0.5); doc.line(15, 50, pageWidth - 15, 50);

    autoTable(doc, {
        startY: 55,
        head: [['CLIENTE', 'VENDEDOR', 'EMISSÃO', 'PREVISÃO DE ENTREGA']],
        body: [[parentOrder.customer_name, parentOrder.created_by?.full_name || 'N/A', format(new Date(parentOrder.created_at), 'dd/MM/yyyy', { locale: ptBR }), formattedForecastDate]],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['PRODUTO (BASE)', 'SERVIÇO (ESTAMPA)', 'QUANTIDADE']],
        body: [[ item.fabric_type, item.stamp_ref, `${item.quantity_meters}m` ]],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    const artStartY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('ARTE APROVADA', 15, artStartY);

    const artY = artStartY + 5;
    const maxImgWidth = pageWidth - 30;
    const maxImgHeight = pageHeight - artY - 25;
    const imgProps = doc.getImageProperties(artBase64);
    const ratio = Math.min(maxImgWidth / imgProps.width, maxImgHeight / imgProps.height);
    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;
    const imgXCentered = (pageWidth - imgWidth) / 2;

    doc.setDrawColor(180, 180, 180).setLineWidth(0.5).rect(imgXCentered - 1, artY - 1, imgWidth + 2, imgHeight + 2, 'S');
    doc.addImage(artBase64, 'PNG', imgXCentered, artY, imgWidth, imgHeight);

    const footerY = pageHeight - 15;
    doc.setFontSize(9).setTextColor(150).text('OP gerada com MJProcess', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`OP-${formattedOpNumber}-${parentOrder.customer_name}-${item.stamp_ref}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Não foi possível gerar o PDF. Verifique se as imagens estão acessíveis e tente novamente.");
  }
};
</script>

<style scoped lang="scss">
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(40, 40, 45, 0.9) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.order-info-header {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: rgba(0,0,0,0.2);
  border-radius: 8px;
  margin-bottom: 16px;
}

.item-list {
  padding: 0;
}

.item-row {
  min-height: 90px;
  transition: background-color 0.2s ease-in-out;
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.item-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 8px;
}

.item-actions {
  min-width: 380px;
  justify-content: flex-end;
}
</style>
