<template>
  <v-container>
    <v-card class="glassmorphism-card-stock">
        <v-toolbar color="transparent">
            <v-toolbar-title class="font-weight-bold">Gestão de Estoque</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              color="secondary"
              variant="tonal"
              class="mr-4"
              @click="syncStock"
              :loading="isSyncing"
            >
              <v-icon start>mdi-sync</v-icon>
              Sincronizar com Gestão Click
            </v-btn>
            <v-btn color="primary" @click="openNewItemDialog">
                <v-icon start>mdi-plus</v-icon>
                Novo Tecido
            </v-btn>
        </v-toolbar>

        <v-data-table
            :headers="headers"
            :items="stockItems"
            :loading="loading"
            class="elevation-0 bg-transparent"
            item-value="id"
        >
            <template v-slot:item.available_meters="{ item }">
                <v-chip :color="getStockColor(item)" variant="tonal">
                    {{ item.available_meters }}m
                </v-chip>
            </template>
            <template v-slot:item.low_stock_threshold="{ item }">
              <span v-if="item.low_stock_threshold">{{ item.low_stock_threshold }}m</span>
              <span v-else class="text-caption text-grey">N/D</span>
            </template>
            <template v-slot:item.actions="{ item }">
                <v-btn icon="mdi-pencil-outline" variant="text" size="small" @click="openEditDialog(item)"></v-btn>
            </template>
            <template v-slot:loading>
                <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
            </template>
             <template v-slot:no-data>
                <div class="py-8 text-center text-grey">
                    Nenhum item em estoque encontrado.
                </div>
            </template>
        </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="500px" persistent>
        <v-card class="glassmorphism-card">
            <v-card-title class="dialog-header">
                <span class="text-h5">{{ dialogTitle }}</span>
            </v-card-title>
            <v-card-text class="py-4">
                <v-text-field
                    v-if="!isEditing"
                    v-model="editedItem.fabric_type"
                    label="Nome do Tecido"
                    variant="outlined"
                    autofocus
                    class="mb-4"
                ></v-text-field>
                 <v-text-field
                    v-model.number="editedItem.low_stock_threshold"
                    label="Limite Mínimo para Alerta"
                    type="number"
                    variant="outlined"
                    class="mb-4"
                    hint="O alerta será disparado quando o estoque ficar abaixo deste valor."
                    persistent-hint
                ></v-text-field>
                <v-text-field
                    v-model.number="editedItem.meters_per_roll"
                    label="Metros por Rolo (Padrão)"
                    type="number"
                    variant="outlined"
                    class="mb-4"
                ></v-text-field>
                <v-text-field
                    v-if="editedItem.unit_of_measure === 'kg'"
                    v-model.number="editedItem.rendimento"
                    label="Rendimento (metros por kg)"
                    type="number"
                    variant="outlined"
                    class="mb-4"
                    hint="Ex: 3.5"
                    persistent-hint
                ></v-text-field>
                <v-text-field
                    v-model.number="editedItem.quantity"
                    label="Quantidade a Adicionar/Remover"
                    type="number"
                    variant="outlined"
                    :placeholder="isEditing ? `Atual: ${editedItem.current_stock}m` : ''"
                    hint="Use valores negativos para remover do estoque"
                    persistent-hint
                ></v-text-field>
            </v-card-text>
            <v-card-actions class="dialog-footer">
                <v-spacer></v-spacer>
                <v-btn text @click="closeDialog">Cancelar</v-btn>
                <v-btn color="primary" variant="flat" @click="saveStock" :loading="isSaving">Salvar</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
     <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import { gestaoApi } from '@/api/gestaoClick';

type StockItem = {
  id: string;
  fabric_type: string;
  available_meters: number;
  meters_per_roll: number | null;
  unit_of_measure: 'metro' | 'kg';
  rendimento: number | null;
  low_stock_threshold: number | null;
  gestao_click_id?: string | null;
};

const stockItems = ref<StockItem[]>([]);
const loading = ref(true);
const dialog = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const isSyncing = ref(false);
const snackbar = reactive({ show: false, text: '', color: '' });


const editedItem = ref<{
    id: string | null;
    fabric_type: string;
    quantity: number | null;
    meters_per_roll: number | null;
    unit_of_measure: 'metro' | 'kg';
    rendimento: number | null;
    low_stock_threshold: number | null;
    current_stock?: number;
}>({
    id: null,
    fabric_type: '',
    quantity: null,
    meters_per_roll: null,
    unit_of_measure: 'metro',
    rendimento: null,
    low_stock_threshold: null
});

const headers = [
  { title: 'Tipo de Tecido', key: 'fabric_type', sortable: true },
  { title: 'Metragem Disponível', key: 'available_meters', sortable: true },
  { title: 'Limite Mínimo', key: 'low_stock_threshold', sortable: true },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' },
];

const dialogTitle = computed(() => isEditing.value ? `Atualizar Estoque: ${editedItem.value.fabric_type}` : 'Adicionar Novo Tecido');

const getStockColor = (item: StockItem) => {
  if (item.low_stock_threshold && item.available_meters < item.low_stock_threshold) {
    return 'error';
  }
  return 'primary';
};

const showSnackbar = (text: string, color: 'success' | 'error' | 'info') => {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
};

const syncStock = async () => {
  isSyncing.value = true;
  showSnackbar('Iniciando sincronização com o sistema de gestão...', 'info');
  try {
    const gestaoProducts = await gestaoApi.buscarProdutos();
    if (!gestaoProducts || gestaoProducts.length === 0) {
      throw new Error("Nenhum produto que movimenta estoque foi encontrado no Gestão Click.");
    }

    const stockToSync = gestaoProducts.map(p => ({
      gestao_click_id: p.id,
      fabric_type: p.nome,
      available_meters: parseFloat(p.estoque as string) || 0,
      base_price: parseFloat(p.valor_venda) || 0,
      unit_of_measure: (p.unidade as string)?.toLowerCase() === 'kg' ? 'kg' : 'metro',
    }));

    const { error } = await supabase
      .from('stock')
      .upsert(stockToSync, { onConflict: 'gestao_click_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    showSnackbar('Estoque sincronizado com sucesso!', 'success');
    await fetchStock();

  } catch (err: any) {
    console.error("Erro ao sincronizar estoque:", err);
    showSnackbar(`Erro na sincronização: ${err.message}`, 'error');
  } finally {
    isSyncing.value = false;
  }
};


const fetchStock = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('stock').select('*').order('fabric_type');
    if (error) throw error;
    stockItems.value = data || [];
  } catch (err: any) {
    showSnackbar(`Erro ao buscar estoque: ${err.message}`, 'error');
  } finally {
    loading.value = false;
  }
};

const openNewItemDialog = () => {
  isEditing.value = false;
  editedItem.value = { id: null, fabric_type: '', quantity: null, meters_per_roll: null, unit_of_measure: 'metro', rendimento: null, low_stock_threshold: 100 };
  dialog.value = true;
};

const openEditDialog = (item: StockItem) => {
  isEditing.value = true;
  editedItem.value = {
      id: item.id,
      fabric_type: item.fabric_type,
      quantity: null,
      meters_per_roll: item.meters_per_roll,
      unit_of_measure: item.unit_of_measure,
      rendimento: item.rendimento,
      low_stock_threshold: item.low_stock_threshold,
      current_stock: item.available_meters
  };
  dialog.value = true;
};

const closeDialog = () => {
  dialog.value = false;
};

const saveStock = async () => {
  if (isSaving.value) return;
  if (!editedItem.value.fabric_type && !isEditing.value) {
      showSnackbar("O nome do tecido é obrigatório.", 'error');
      return;
  }

  isSaving.value = true;

  try {
      const payload = {
          meters_per_roll: editedItem.value.meters_per_roll,
          rendimento: editedItem.value.unit_of_measure === 'kg' ? editedItem.value.rendimento : null,
          low_stock_threshold: editedItem.value.low_stock_threshold,
      };

      if (isEditing.value) {
          const { error: updateError } = await supabase
            .from('stock')
            .update(payload)
            .eq('id', editedItem.value.id);
          if (updateError) throw updateError;

          if (editedItem.value.quantity !== null && editedItem.value.quantity !== 0) {
              const { error: rpcError } = await supabase.rpc('increment', {
                  table_name: 'stock',
                  row_id: editedItem.value.id,
                  x: editedItem.value.quantity
              });
              if (rpcError) throw rpcError;
          }
      } else {
          const { error } = await supabase.from('stock').insert({
              fabric_type: editedItem.value.fabric_type,
              available_meters: editedItem.value.quantity || 0,
              meters_per_roll: editedItem.value.meters_per_roll,
              unit_of_measure: editedItem.value.unit_of_measure,
              rendimento: payload.rendimento,
              low_stock_threshold: payload.low_stock_threshold,
          });
          if (error) throw error;
      }
      await fetchStock();
      closeDialog();
      showSnackbar('Operação no estoque realizada com sucesso!', 'success');

  } catch (err: any) {
      showSnackbar(`Erro ao salvar no estoque: ${err.message}`, 'error');
  } finally {
      isSaving.value = false;
  }
};

onMounted(() => {
  fetchStock();
});
</script>

<style scoped lang="scss">
.glassmorphism-card-stock, .glassmorphism-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.dialog-header { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
</style>
