<template>
  <v-container fluid class="pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-4 px-0">
      <v-toolbar-title class="font-weight-bold text-h4 d-flex align-center">
        <v-icon start size="36" color="primary">mdi-list-status</v-icon>
        Acompanhamento de Pedidos
      </v-toolbar-title>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">Carregando pedidos em andamento...</p>
    </div>

    <v-alert v-else-if="activeOrders.length === 0" type="success" variant="tonal" class="mx-auto" max-width="600">
       Não há nenhum pedido ativo no momento.
    </v-alert>

    <v-card v-else class="main-card" variant="flat">
      <v-data-table
        :headers="headers"
        :items="activeOrders"
        item-value="id"
        class="bg-transparent"
        v-model:expanded="expanded"
        show-expand
        items-per-page="15"
      >
        <template v-slot:item.status="{ value }">
            <v-chip size="small" :color="statusColorMap[value]" label variant="tonal" class="font-weight-bold">
                {{ statusDisplayMap[value] || value }}
            </v-chip>
        </template>

        <template v-slot:item.total_items="{ item }">
          <span v-if="item.is_launch">{{ item.order_items.length }} itens</span>
          <span v-else>Pedido Único</span>
        </template>

        <template v-slot:item.data-table-expand="{ toggleExpand, isExpanded, item }">
            <v-btn
                v-if="item.is_launch"
                icon
                variant="text"
                :class="{'v-data-table__expand-icon--expanded': isExpanded(item)}"
                @click="toggleExpand(item)"
            >
                <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
        </template>

        <template v-slot:expanded-row="{ columns, item }">
          <tr v-if="item.is_launch">
            <td :colspan="columns.length" class="pa-0">
              <div class="expanded-content">
                <div class="text-subtitle-1 font-weight-bold mb-2">Itens do Lançamento</div>
                <div v-for="order_item in item.order_items" :key="order_item.id" class="item-row">
                  <div class="item-details">
                    <v-img :src="order_item.stamp_image_url" class="item-thumbnail" cover></v-img>
                    <div>
                      <div class="font-weight-bold">{{ order_item.stamp_ref }}</div>
                      <div class="text-caption">{{ order_item.fabric_type }} - {{ order_item.quantity_meters }}m</div>
                    </div>
                  </div>
                  <div class="item-status-and-actions">
                    <v-checkbox-btn
                        :model-value="order_item.is_op_generated"
                        @update:model-value="() => toggleOpGenerated(order_item)"
                        :disabled="!userStore.isAdmin"
                        color="info"
                        class="mr-2"
                        />
                    <v-chip
                        size="small"
                        :color="statusColorMap[order_item.status] || 'grey'"
                        label
                        variant="tonal"
                        class="font-weight-bold"
                    >
                      {{ statusDisplayMap[order_item.status] || order_item.status }}
                    </v-chip>

                    <v-btn
                      v-if="order_item.is_op_generated"
                      color="info"
                      variant="outlined"
                      size="small"
                      class="ml-4"
                      @click="generatePdf(order_item, item)"
                    >
                      <v-icon start>mdi-file-pdf-box</v-icon>
                      Gerar OP
                    </v-btn>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

type OrderItem = {
  id: string; fabric_type: string; stamp_ref: string; quantity_meters: number;
  stamp_image_url: string; status: string; is_op_generated: boolean;
  unit_of_measure: 'metro' | 'kg' | null;
  quantity_unit: number | null;
};
type Order = {
  id: string; customer_name: string; created_at: string; status: string;
  is_launch: boolean;
  order_number: number;
  created_by: { full_name: string };
  order_items: OrderItem[];
};

const loading = ref(true);
const activeOrders = ref<Order[]>([]);
const expanded = ref([]);

const headers = [
  { title: 'Cliente', key: 'customer_name', sortable: true },
  { title: 'Vendedor', key: 'created_by.full_name' },
  { title: 'Tipo', key: 'total_items', sortable: false },
  { title: 'Status Geral', key: 'status' },
  { title: '', key: 'data-table-expand', align: 'end' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'No Design',
    customer_approval: 'Aprovação Vendedor',
    approved_by_designer: 'Aprovado (Designer)',
    approved_by_seller: 'Aprovado (Vendedor)',
    production_queue: 'Fila de Produção',
    in_printing: 'Em Impressão',
    in_cutting: 'Em Corte',
    completed: 'Finalizado',
    pending_stock: 'Aguardando Estoque'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey',
    customer_approval: 'orange',
    approved_by_designer: 'teal',
    approved_by_seller: 'green',
    production_queue: 'grey',
    in_printing: 'blue',
    in_cutting: 'purple',
    completed: 'success',
    pending_stock: 'error'
};

const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) {
      addedDays++;
    }
  }
  return newDate;
};

const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        const dayOfWeek = newDate.getDay();
        if ([2, 4, 6].includes(dayOfWeek)) {
            return newDate;
        }
        newDate.setDate(newDate.getDate() + 1);
    }
};

const fetchActiveOrders = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, customer_name, created_at, status, is_launch, order_number,
        created_by:profiles!created_by(full_name),
        order_items(*)
      `)
      .not('status', 'eq', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    activeOrders.value = data || [];

  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
  } finally {
    loading.value = false;
  }
};

const imageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if(ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject(new Error('Could not get canvas context'));
            }
        };
        img.onerror = reject;
        img.src = url;
    });
};

const toggleOpGenerated = async (item: OrderItem) => {
    const newValue = !item.is_op_generated;
    try {
        const { error } = await supabase.from('order_items').update({ is_op_generated: newValue }).eq('id', item.id);
        if (error) throw error;
        item.is_op_generated = newValue; // Update local state
    } catch (err) {
        console.error("Erro ao atualizar a flag is_op_generated:", err);
        // Revert local state on error
        item.is_op_generated = !newValue;
        alert("Ocorreu um erro ao tentar salvar a liberação da OP.");
    }
};

const generatePdf = async (item: OrderItem, parentOrder: Order) => {
  if (!parentOrder) {
      alert("Erro: não foi possível encontrar os dados do pedido principal.");
      return;
  }

  try {
    const { data: opNumber, error: rpcError } = await supabase.rpc('generate_op_number', { p_item_id: item.id });
    if (rpcError) throw rpcError;

    const { data: schedule, error: scheduleError } = await supabase
      .from('production_schedule')
      .select('scheduled_date')
      .eq('order_item_id', item.id)
      .single();

    if (scheduleError) throw scheduleError;
    if (!schedule) throw new Error('Agendamento do item não encontrado para gerar o PDF.');

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
      imageToBase64(item.stamp_image_url)
    ]);

    const logoProps = doc.getImageProperties(logoBase64);
    const logoWidth = 50;
    const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
    doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text([
      "MR JACKY - 20.631.721/0001-07",
      "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
      "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"
    ], pageWidth - 15, 15, { align: 'right' });

    const itemIndex = parentOrder.order_items.findIndex(oi => oi.id === item.id) + 1;
    const totalItems = parentOrder.order_items.length;
    const itemSubtitle = `Item ${itemIndex} de ${totalItems}`;

    doc.setFontSize(18); doc.setTextColor(0); doc.text(`OP #${formattedOpNumber}`, 15, 45);
    doc.setFontSize(12); doc.text(`Pedido #${formattedOrderNumber}`, pageWidth - 15, 45, { align: 'right' });
    doc.setFontSize(10); doc.setTextColor(100); doc.text(itemSubtitle, pageWidth - 15, 51, { align: 'right' });
    doc.setLineWidth(0.5); doc.line(15, 55, pageWidth - 15, 55);

    autoTable(doc, {
        startY: 60,
        head: [['CLIENTE', 'VENDEDOR', 'EMISSÃO', 'PREVISÃO DE ENTREGA']],
        body: [[
            parentOrder.customer_name,
            parentOrder.created_by?.full_name || 'N/A',
            format(new Date(parentOrder.created_at), 'dd/MM/yyyy'),
            formattedForecastDate
        ]],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    let quantityDisplay = `${item.quantity_meters.toLocaleString('pt-BR')}m`;
    if (item.unit_of_measure === 'kg') {
      const originalKg = item.quantity_unit?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) || 'N/A';
      quantityDisplay = `${originalKg}kg (Rendimento: ~${item.quantity_meters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m)`;
    }

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['PRODUTO (BASE)', 'SERVIÇO (ESTAMPA)', 'QUANTIDADE']],
        body: [[ item.fabric_type, item.stamp_ref, quantityDisplay ]],
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
    if (!item.is_op_generated) {
        await toggleOpGenerated(item);
    }
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Não foi possível gerar o PDF. Verifique se o item já foi agendado para produção e se as imagens estão acessíveis.");
  }
};

const formatDate = (dateString: string) => format(new Date(dateString), 'dd/MM/yy', { locale: ptBR });

onMounted(fetchActiveOrders);

</script>

<style scoped lang="scss">
.main-card {
  background-color: rgba(25, 25, 30, 0.7);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.expanded-content {
  padding: 16px 24px;
  background-color: rgba(0,0,0,0.25);
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
}

.item-details {
  display: flex;
  align-items: center;
  gap: 16px;
}

.item-thumbnail {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}

.item-status-and-actions {
    display: flex;
    align-items: center;
}
</style>
