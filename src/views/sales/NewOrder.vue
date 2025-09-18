<template>
  <v-container class="py-8">
    <v-card class="glassmorphism-card-order mx-auto" max-width="1200">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">
          <v-icon start>mdi-plus-box-outline</v-icon>
          Lançar Novo Pedido
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <div class="pa-2 text-right">
          <div class="text-caption text-grey">Próximo Pedido</div>
          <div v-if="loadingNextOrderNumber" class="text-center">
            <v-progress-circular indeterminate size="20" width="2"></v-progress-circular>
          </div>
          <div v-else class="text-h6 font-weight-bold">#{{ String(nextOrderNumber).padStart(4, '0') }}</div>
        </div>
      </v-toolbar>

      <v-stepper v-if="!orderCreatedSuccess" v-model="step" :items="stepperItems" alt-labels class="stepper-transparent">
        <template v-slot:item.1>
          <v-card flat color="transparent" class="pa-md-4">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-6 text-center">Informações do Cliente</h3>
              <v-form ref="step1Form">
                <v-autocomplete
                  v-model="orderHeader.customer_id"
                  v-model:search="clientSearch"
                  :items="clientList"
                  item-title="nome"
                  item-value="id"
                  label="Cliente"
                  variant="outlined"
                  prepend-inner-icon="mdi-account-search-outline"
                  :rules="[rules.required]"
                  class="mb-4"
                  placeholder="Digite para buscar ou cadastre um novo cliente"
                  :loading="isSearchingClients"
                  no-filter
                >
                  <template v-slot:append>
                    <v-tooltip text="Cadastrar Novo Cliente" location="top">
                      <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" icon="mdi-account-plus-outline" variant="text" @click="showClientModal = true"></v-btn>
                      </template>
                    </v-tooltip>
                  </template>
                  <template v-slot:no-data>
                    <v-list-item
                      title="Nenhum cliente encontrado."
                      subtitle="Clique no '+' para cadastrar um novo."
                    ></v-list-item>
                  </template>
                </v-autocomplete>

                <v-text-field
                  :model-value="userStore.profile?.full_name"
                  label="Vendedor"
                  variant="outlined"
                  prepend-inner-icon="mdi-account-tie-outline"
                  readonly
                  class="mb-4"
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:item.2>
           <v-card flat color="transparent">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-4 text-center">Itens do Pedido</h3>
              <v-row>
                <v-col cols="12" md="5">
                  <v-card class="item-list-card" variant="outlined">
                    <v-list class="bg-transparent">
                      <v-list-subheader>
                        ITENS ADICIONADOS (Total: {{ formatCurrency(totalOrderValue) }})
                      </v-list-subheader>
                      <div v-if="orderItems.length === 0" class="text-center text-grey pa-4">Nenhum item adicionado.</div>
                      <v-list-item
                        v-for="(item, index) in orderItems"
                        :key="index"
                        :active="editedItemIndex === index"
                        @click="editItem(index)"
                      >
                        <template #prepend>
                          <v-img
                            v-if="item.stamp_image_url"
                            :src="item.stamp_image_url"
                            width="40"
                            height="40"
                            cover
                            class="rounded mr-4"
                          >
                            <template v-slot:placeholder>
                              <div class="d-flex align-center justify-center fill-height">
                                <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
                              </div>
                            </template>
                          </v-img>
                          <v-icon v-else class="mr-4" size="40" color="grey-darken-1">mdi-image-multiple-outline</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold d-flex align-center">
                          {{ item.stamp_ref || 'Novo Item' }}
                          <v-chip
                            v-if="item.design_tag"
                            :color="tagColorMap[item.design_tag]"
                            size="x-small"
                            class="ml-2"
                            label
                          >
                            {{ item.design_tag }}
                          </v-chip>
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ item.fabric_type || 'Sem tecido' }} -
                          <span v-if="item.unit_of_measure === 'kg'">~{{ item.quantity_meters?.toFixed(2) || 0 }}m</span>
                          <span v-else>{{ item.quantity || 0 }}m</span>
                          ({{ item.quantity || 0 }}{{ item.unit_of_measure }}) -
                          {{ formatCurrency(item.valor_unitario) }}
                        </v-list-item-subtitle>
                        <template v-slot:append>
                          <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click.stop="removeItem(index)"></v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                    <v-divider></v-divider>
                    <v-card-actions>
                      <v-btn block variant="tonal" @click="prepareNewItem">
                        <v-icon start>mdi-plus</v-icon> Adicionar Novo Item
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>

                <v-col cols="12" md="7">
                  <v-card class="item-form-card" variant="flat">
                    <v-card-title>{{ isEditing ? 'Editando Item' : 'Adicionando Novo Item' }}</v-card-title>
                    <v-card-text>
                      <v-form ref="itemForm">
                        <v-row>
                          <v-col cols="12" sm="6">
                            <v-autocomplete
                              v-model="editedItem.fabric_type"
                              :items="gestaoClickProducts"
                              item-title="nome"
                              item-value="nome"
                              label="Produto (Base)"
                              variant="outlined"
                              density="compact"
                              :loading="loadingGestaoClickProducts"
                              :rules="[rules.required]"
                            >
                              <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props" :subtitle="`Estoque: ${item.raw.estoque}${(item.raw.unidade || '').toLowerCase()}`"></v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>
                          <v-col cols="12" sm="6">
                            <v-autocomplete
                              v-if="!isUploadingNewStamp"
                              v-model="editedItem.stamp_ref_id"
                              :items="gestaoClickServices"
                              item-title="nome"
                              item-value="id"
                              label="Serviço (Estampa)"
                              variant="outlined"
                              density="compact"
                              :rules="[rules.required]"
                              :loading="loadingGestaoClickServices"
                              :custom-filter="(itemTitle, queryText, item) =>
                                item.title.toLowerCase().includes(queryText.toLowerCase()) ||
                                item.value.toString().includes(queryText)"
                            >
                               <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props" :prepend-avatar="item.raw.imagem_url" :subtitle="`ID: ${item.raw.id}`"></v-list-item>
                              </template>
                            </v-autocomplete>
                             <v-text-field
                                v-else
                                v-model="editedItem.stamp_ref"
                                label="Nome/Referência da Nova Estampa"
                                variant="outlined"
                                density="compact"
                                :rules="[rules.required]"
                              ></v-text-field>
                          </v-col>

                          <v-col cols="12" class="text-center">
                            <v-file-input
                                v-if="isUploadingNewStamp"
                                @change="handleNewStampFileChange"
                                label="Arquivo da Imagem (.png, .jpg)"
                                variant="outlined"
                                accept="image/png, image/jpeg"
                                :rules="[rules.fileRequired]"
                                density="compact"
                              ></v-file-input>
                            <v-img
                              v-if="editedItem.stamp_image_url"
                              :src="editedItem.stamp_image_url"
                              max-height="150"
                              contain
                              class="rounded border"
                            ></v-img>
                             <div v-else-if="!isUploadingNewStamp" class="d-flex align-center justify-center text-grey-lighten-1" style="height: 150px; border: 2px dashed #444; border-radius: 4px;">
                              Selecione uma estampa para visualizar
                            </div>
                             <v-btn
                                variant="text"
                                @click="toggleStampUpload"
                                class="mt-2"
                              >
                                {{ isUploadingNewStamp ? 'Cancelar e Buscar Existente' : 'Não encontrou? Cadastre uma nova estampa' }}
                              </v-btn>
                          </v-col>

                          <v-col cols="12">
                            <v-text-field
                                v-if="selectedProductUnit !== 'kg'"
                                v-model.number="editedItem.quantity"
                                label="Quantidade (m)"
                                type="number"
                                variant="outlined"
                                density="compact"
                                :rules="[rules.required, rules.positive]"
                                :disabled="!editedItem.fabric_type"
                            ></v-text-field>
                            <v-row v-else>
                                <v-col cols="6">
                                    <v-text-field
                                        v-model.number="editedItem.quantity"
                                        label="Quantidade (kg)"
                                        type="number"
                                        variant="outlined"
                                        density="compact"
                                        :rules="[rules.required, rules.positive]"
                                        :disabled="!editedItem.fabric_type"
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="6">
                                     <v-text-field
                                        v-model.number="tempMeters"
                                        label="Converter de Metros (m)"
                                        type="number"
                                        variant="outlined"
                                        density="compact"
                                        :disabled="!editedItem.fabric_type || !selectedProductRendimento"
                                        hint="Preencha para calcular o KG"
                                        persistent-hint
                                    ></v-text-field>
                                </v-col>
                            </v-row>


                            <div v-if="selectedProductStock !== null" class="mt-n2 mb-4 px-2">
                              <div class="d-flex justify-space-between text-caption text-grey">
                                <span v-if="editedItem.quantity > selectedProductStock" class="text-error">
                                  Atenção: Estoque ficará negativo!
                                </span>
                                <span v-else>Uso do estoque disponível:</span>
                                <span>{{ selectedProductStock }}{{ selectedProductUnit }}</span>
                              </div>
                              <v-progress-linear
                                :model-value="((editedItem.quantity || 0) / selectedProductStock) * 100"
                                :color="getStockUsageColor(editedItem.quantity)"
                                height="6"
                                rounded
                              ></v-progress-linear>
                            </div>
                          </v-col>

                           <v-col cols="12">
                            <v-checkbox v-model="overridePrice" label="Alterar valor unitário"></v-checkbox>
                            <v-text-field
                              v-model.number="editedItem.valor_unitario"
                              label="Valor Unitário"
                              type="number"
                              variant="outlined"
                              density="compact"
                              :readonly="!overridePrice"
                            ></v-text-field>
                          </v-col>

                          <v-col cols="12">
                            <v-textarea
                              v-model="editedItem.notes"
                              label="Observações para este item"
                              variant="outlined"
                              rows="2"
                              density="compact"
                            ></v-textarea>
                          </v-col>
                          <v-col cols="12">
                            <label class="v-label text-caption mb-2 d-block">Destino no Design</label>
                            <div class="d-flex ga-2 flex-wrap">
                              <v-btn
                                v-for="tag in (Object.keys(tagColorMap) as Array<keyof typeof tagColorMap>)"
                                :key="tag"
                                :color="tagColorMap[tag]"
                                :variant="editedItem.design_tag === tag ? 'flat' : 'outlined'"
                                size="small"
                                @click="editedItem.design_tag = tag"
                              >
                                {{ tag }}
                              </v-btn>
                            </div>
                          </v-col>
                        </v-row>
                      </v-form>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="primary" variant="flat" @click="saveOrUpdateItem" :disabled="!isItemFormValid">
                        <v-icon start>{{ isEditing ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
                        {{ isEditing ? 'Atualizar Item' : 'Adicionar à Lista' }}
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:item.3>
           <v-card flat color="transparent" class="pa-md-4">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-6 text-center">Pagamento e Finalização</h3>
              <v-form ref="step3Form">
                 <v-textarea
                  v-model="orderHeader.observation"
                  label="Observações do Pedido"
                  variant="outlined"
                  rows="3"
                  class="mb-4"
                ></v-textarea>
                <v-radio-group v-model="paymentDetails.type" inline class="mb-4">
                  <v-radio label="À vista" value="vista"></v-radio>
                  <v-radio label="Parcelado" value="parcelado"></v-radio>
                </v-radio-group>

                <v-expand-transition>
                  <div v-if="paymentDetails.type === 'parcelado'">
                    <v-row>
                      <v-col cols="12" sm="6">
                        <v-autocomplete
                          v-model="paymentDetails.installment_payment_method_id"
                          :items="paymentMethods"
                          item-title="nome"
                          item-value="id"
                          label="Forma de Pagamento"
                          variant="outlined"
                        ></v-autocomplete>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-text-field
                          v-model.number="paymentDetails.installments_count"
                          label="Qtd. parcelas"
                          type="number"
                          variant="outlined"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-select
                          v-model.number="paymentDetails.installments_interval"
                          :items="[3, 30, 60, 90]"
                          label="Intervalo entre parcelas (dias)"
                          variant="outlined"
                        ></v-select>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-text-field
                          v-model="paymentDetails.first_due_date"
                          label="Data 1ª parcela"
                          type="date"
                          variant="outlined"
                        ></v-text-field>
                      </v-col>
                    </v-row>
                    <v-btn color="secondary" block @click="generateInstallments" class="mb-4">
                      <v-icon start>mdi-cogs</v-icon>
                      Gerar Parcelas
                    </v-btn>
                  </div>
                </v-expand-transition>

                <v-table class="bg-transparent mb-6">
                  <thead>
                    <tr>
                      <th class="text-left">Vencimento</th>
                      <th class="text-left">Valor</th>
                      <th class="text-left">Forma de Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(installment, index) in paymentDetails.installments" :key="index">
                      <td>
                        <v-text-field
                          v-model="installment.due_date"
                          type="date"
                          variant="underlined"
                          density="compact"
                          hide-details
                        ></v-text-field>
                      </td>
                      <td>
                        <v-text-field
                          v-model.number="installment.value"
                          @update:model-value="(val) => handleInstallmentValueChange(index, val)"
                          type="number"
                          variant="underlined"
                          density="compact"
                          hide-details
                          prefix="R$"
                        ></v-text-field>
                      </td>
                      <td>
                        <v-autocomplete
                          v-model="installment.payment_method_id"
                          :items="paymentMethods"
                          item-title="nome"
                          item-value="id"
                          variant="underlined"
                          density="compact"
                          hide-details
                        ></v-autocomplete>
                      </td>
                    </tr>
                  </tbody>
                </v-table>

                <v-switch
                  v-model="orderHeader.has_down_payment"
                  label="Houve pagamento de entrada (sinal)?"
                  color="primary"
                  inset
                  class="mt-4"
                ></v-switch>

                <v-file-input
                  v-if="orderHeader.has_down_payment"
                  v-model="orderHeader.down_payment_proof_file"
                  @change="handleProofFileChange"
                  label="Comprovante de Entrada (Máx 5MB)"
                  variant="outlined"
                  prepend-icon="mdi-upload"
                  accept="image/*,.pdf"
                  class="mt-4"
                  :rules="[rules.required, rules.fileSize]"
                ></v-file-input>
              </v-form>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:actions>
          <div class="d-flex w-100 pa-4">
            <v-btn v-if="step > 1" @click="step--" variant="tonal">Voltar</v-btn>
            <v-spacer></v-spacer>
            <v-btn v-if="step < 3" @click="nextStep" :disabled="!isStepValid">Continuar</v-btn>
            <v-btn v-else @click="submitLaunch" :loading="isSubmitting" :disabled="!isStepValid" color="primary" variant="flat">
              <v-icon left>mdi-rocket-launch</v-icon>
              Enviar Lançamento
            </v-btn>
          </div>
        </template>
      </v-stepper>

      <div v-else class="pa-8 text-center">
        <v-icon size="80" color="success" class="mb-4">mdi-check-circle-outline</v-icon>
        <h2 class="text-h5 font-weight-bold">Pedido #{{ String(createdOrderNumber).padStart(4, '0') }} criado com sucesso!</h2>
        <p class="mt-2 text-medium-emphasis">O pedido foi enviado para a equipe de design e para o sistema de gestão.</p>
        <div class="mt-8">
          <v-btn
            color="primary"
            size="large"
            variant="flat"
            class="mr-4"
            @click="generateAndUploadQuotePdf"
            :loading="isGeneratingPdf"
          >
            <v-icon left>mdi-file-pdf-box</v-icon>
            Gerar e Anexar Orçamento
          </v-btn>
          <v-btn
            size="large"
            variant="tonal"
            @click="resetForm"
          >
            Lançar Novo Pedido
          </v-btn>
        </div>
      </div>

      <v-alert v-if="feedback.message" :type="feedback.type" class="ma-4" closable @click:close="feedback.message = ''">
        {{ feedback.message }}
      </v-alert>
    </v-card>

    <ClientFormModal
      :show="showClientModal"
      @close="showClientModal = false"
      @client-created="handleClientCreated"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, nextTick, toRaw, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { useAppStore } from '@/stores/app';
import type { VForm } from 'vuetify/components';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientFormModal from '@/components/ClientFormModal.vue';
import { gestaoApi } from '@/api/gestaoClick';

// --- Type Definitions ---
type OrderHeader = {
    customer_id: number | null;
    customer_name: string;
    has_down_payment: boolean;
    down_payment_proof_file: File | null;
    observation?: string;
};
type OrderItem = {
  fabric_type: string | null;
  stamp_ref_id: string | null;
  stamp_ref: string;
  quantity: number | null;
  quantity_meters: number | null;
  unit_of_measure: 'm' | 'kg';
  rendimento: number | null;
  valor_unitario: number | null;
  stamp_image_url: string | null;
  notes: string;
  design_tag: 'Desenvolvimento' | 'Alteração' | 'Finalização' | 'Aprovado';
  new_stamp_file?: File | null;
};
type StampLibraryItem = {
    id: number;
    gestao_click_service_id: string;
    name: string;
    image_url: string;
    is_approved_for_sale: boolean;
};
type StockItem = {
  id: string;
  gestao_click_id: string;
  fabric_type: string;
  available_meters: number;
  low_stock_threshold: number | null;
  unit_of_measure: 'metro' | 'kg';
  rendimento: number | null;
};
type Feedback = { message: string; type: 'success' | 'error'; }
type Client = { id: number; nome: string; }
type GestaoClickProduct = { id: string; nome: string; estoque: number | string; valor_venda: string; unidade: string | null; rendimento?: string | null; };
type GestaoClickService = { id: string; nome: string; valor_venda: string; imagem_url?: string; };
type SaleStatus = { id: number; nome: string; };
type PaymentMethod = { id: string; nome: string; };

interface Installment {
  due_date: string;
  value: number;
  payment_method_id: number | null;
}

// --- Component State ---
const userStore = useUserStore();
const appStore = useAppStore();
const step = ref(1);
const isSubmitting = ref(false);
const step1Form = ref<VForm | null>(null);
const step3Form = ref<VForm | null>(null);
const itemForm = ref<VForm | null>(null);
const stepperItems = [
  { title: 'Cliente', icon: 'mdi-account' },
  { title: 'Itens do Pedido', icon: 'mdi-format-list-bulleted-square' },
  { title: 'Pagamento', icon: 'mdi-cash-multiple' }
];
const nextOrderNumber = ref<number | null>(null);
const loadingNextOrderNumber = ref(true);
const orderCreatedSuccess = ref(false);
const createdOrderId = ref<string | null>(null);
const createdOrderNumber = ref<number | null>(null);
const isGeneratingPdf = ref(false);
const overridePrice = ref(false);
const tempMeters = ref<number | null>(null);


const paymentMethods = ref<PaymentMethod[]>([]);
const paymentDetails = reactive({
  type: 'vista' as 'vista' | 'parcelado',
  installments: [] as Installment[],
  installment_payment_method_id: null as number | null,
  installments_count: 1,
  installments_interval: 30,
  first_due_date: format(new Date(), 'yyyy-MM-dd'),
});


// --- Client Management State ---
const showClientModal = ref(false);
const clientList = ref<Client[]>([]);
const clientSearch = ref('');
const isSearchingClients = ref(false);
let searchTimeout: NodeJS.Timeout;

// --- Gestao Click, Stock & Stamp Library Data State ---
const gestaoClickProducts = ref<GestaoClickProduct[]>([]);
const stockItems = ref<StockItem[]>([]);
const loadingGestaoClickProducts = ref(true);
const gestaoClickServices = ref<GestaoClickService[]>([]);
const loadingGestaoClickServices = ref(true);
const saleStatuses = ref<SaleStatus[]>([]);
const stampLibrary = ref<StampLibraryItem[]>([]);
const isUploadingNewStamp = ref(false);

const tagColorMap = {
  'Desenvolvimento': '#40c4ff',
  'Alteração': '#ffab40',
  'Finalização': '#26A69A',
  'Aprovado': '#4CAF50'
};

const orderHeader = reactive<OrderHeader>({
    customer_id: null,
    customer_name: '',
    has_down_payment: false,
    down_payment_proof_file: null,
});

const createNewItem = (): OrderItem => ({
  fabric_type: null, stamp_ref_id: null, stamp_ref: '', quantity: null, quantity_meters: null,
  unit_of_measure: 'm', rendimento: null, valor_unitario: null, stamp_image_url: null,
  notes: '', design_tag: 'Desenvolvimento', new_stamp_file: null,
});

const orderItems = ref<OrderItem[]>([]);
const editedItem = ref<OrderItem>(createNewItem());
const editedItemIndex = ref<number | null>(null);
const isEditing = computed(() => editedItemIndex.value !== null);

const feedback = reactive<Feedback>({ message: '', type: 'success' });


// --- Validation and Computed Properties ---
const rules = {
  required: (v: any) => !!v || 'Campo obrigatório.',
  positive: (v: number | null) => (v != null && v > 0) || 'O valor deve ser maior que zero.',
  fileRequired: (v: any) => !!v || 'É obrigatório selecionar um arquivo.',
  fileSize: (v: File[] | null) => !v || v.length === 0 || !v[0] || v[0].size < 5000000 || 'O arquivo não pode exceder 5 MB!',
};

const totalOrderValue = computed(() => {
  return orderItems.value.reduce((total, item) => total + (item.quantity || 0) * (item.valor_unitario || 0), 0);
});

watch(totalOrderValue, (newValue) => {
    if (paymentDetails.type === 'vista' && paymentDetails.installments.length > 0) {
        paymentDetails.installments[0].value = newValue;
    }
});

watch(() => paymentDetails.type, (newType) => {
  generateInstallments();
});

const selectedProduct = computed(() => {
    if (!editedItem.value.fabric_type) return null;
    const product = stockItems.value.find(p => p.fabric_type === editedItem.value.fabric_type);
    return product || gestaoClickProducts.value.find(p => p.nome === editedItem.value.fabric_type);
});
const selectedProductUnit = computed(() => {
    if (!selectedProduct.value) return 'm';
    const unit = (selectedProduct.value as StockItem)?.unit_of_measure || (selectedProduct.value as GestaoClickProduct)?.unidade;
    return (unit || 'm').toLowerCase();
});
const selectedProductRendimento = computed(() => {
    if (!selectedProduct.value) return null;
    return (selectedProduct.value as StockItem).rendimento || parseFloat((selectedProduct.value as GestaoClickProduct).rendimento || '0');
});
const selectedProductStock = computed(() => {
    if (!selectedProduct.value) return null;
    return (selectedProduct.value as StockItem).available_meters ?? parseFloat((selectedProduct.value as GestaoClickProduct).estoque as string);
});
const estimatedMeters = computed(() => {
    if (selectedProductUnit.value !== 'kg' || !selectedProductRendimento.value || !editedItem.value.quantity) return null;
    return editedItem.value.quantity * selectedProductRendimento.value;
});
watch(() => editedItem.value.stamp_ref_id, (serviceId) => {
    if (isUploadingNewStamp.value) return;
    if (!serviceId) {
        editedItem.value.stamp_ref = '';
        editedItem.value.stamp_image_url = null;
        return;
    }
    const service = gestaoClickServices.value.find(s => s.id === serviceId);
    if (service) {
        editedItem.value.stamp_ref = service.nome;
    }
    const stamp = stampLibrary.value.find(s => s.gestao_click_service_id === serviceId);
    editedItem.value.stamp_image_url = stamp ? stamp.image_url : null;
});
watch(() => editedItem.value.fabric_type, (productName) => {
    const product = gestaoClickProducts.value.find(p => p.nome === productName);
    if (product) {
        if (!overridePrice.value) {
            editedItem.value.valor_unitario = parseFloat(product.valor_venda) || 0;
        }
        const stockItem = stockItems.value.find(s => s.gestao_click_id === product.id);
        if (stockItem) {
            editedItem.value.unit_of_measure = stockItem.unit_of_measure === 'kg' ? 'kg' : 'm';
            editedItem.value.rendimento = stockItem.rendimento;
        } else {
            editedItem.value.unit_of_measure = (product.unidade || 'm').toLowerCase() === 'kg' ? 'kg' : 'm';
            editedItem.value.rendimento = parseFloat(product.rendimento || '0');
        }
    } else {
        editedItem.value.valor_unitario = null;
    }
});
watch(tempMeters, (newVal) => {
  if (selectedProductUnit.value === 'kg' && selectedProductRendimento.value && newVal) {
    editedItem.value.quantity = parseFloat((newVal / selectedProductRendimento.value).toFixed(2));
  }
});

watch(() => editedItem.value.quantity, (newVal) => {
  if (selectedProductUnit.value === 'kg' && selectedProductRendimento.value && newVal) {
    editedItem.value.quantity_meters = parseFloat((newVal * selectedProductRendimento.value).toFixed(2));
  } else {
      editedItem.value.quantity_meters = newVal;
  }
});
const getStockUsageColor = (quantity: number | null) => {
  if (selectedProductStock.value === null || !quantity) return 'primary';
  if (quantity > selectedProductStock.value) return 'error';
  if (quantity > selectedProductStock.value * 0.8) return 'warning';
  return 'success';
}

const isStepValid = computed(() => {
  if (step.value === 1) {
    return !!orderHeader.customer_id;
  }
  if (step.value === 2) {
    return orderItems.value.length > 0;
  }
  if (step.value === 3) {
    if (orderHeader.has_down_payment && !orderHeader.down_payment_proof_file) return false;
    if (paymentDetails.installments.length === 0) return false;
    const totalInstallmentValue = paymentDetails.installments.reduce((sum, inst) => sum + (inst.value || 0), 0);
    if (Math.abs(totalInstallmentValue - totalOrderValue.value) > 0.01) return false;
    return paymentDetails.installments.every(inst => inst.due_date && inst.value > 0 && inst.payment_method_id);
  }
  return false;
});

const isItemFormValid = computed(() => {
    const commonValid = !!editedItem.value.fabric_type && !!editedItem.value.quantity && editedItem.value.quantity > 0;
    if (isUploadingNewStamp.value) {
        return commonValid && !!editedItem.value.stamp_ref && !!editedItem.value.new_stamp_file;
    }
    return commonValid && !!editedItem.value.stamp_ref_id;
});

// --- API Calls and Data Fetching ---
watch(clientSearch, (newValue) => {
    if (!newValue) { return; }
    isSearchingClients.value = true;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        clientList.value = await gestaoApi.buscarClientes(newValue);
        isSearchingClients.value = false;
    }, 500);
});

const fetchInitialData = async () => {
    loadingGestaoClickProducts.value = true;
    loadingGestaoClickServices.value = true;
    try {
        const [products, services, statuses, stamps, stockData, payMethods] = await Promise.all([
            gestaoApi.buscarProdutos(),
            gestaoApi.buscarServicos(),
            gestaoApi.getSituacoesVenda(),
            supabase.from('stamp_library').select('*').eq('is_approved_for_sale', true),
            supabase.from('stock').select('*'),
            gestaoApi.buscarFormasDePagamento(),
        ]);

        if (stamps.error) throw stamps.error;
        if (stockData.error) throw stockData.error;

        paymentMethods.value = payMethods;

        stampLibrary.value = stamps.data || [];
        stockItems.value = stockData.data || [];

        const approvedStampServiceIds = new Set(stampLibrary.value.map(s => s.gestao_click_service_id));
        gestaoClickServices.value = services
            .filter(service => approvedStampServiceIds.has(service.id))
            .map(service => {
                const matchingStamp = stampLibrary.value.find(s => s.gestao_click_service_id === service.id);
                return { ...service, imagem_url: matchingStamp ? matchingStamp.image_url : undefined };
            });

        gestaoClickProducts.value = products;
        saleStatuses.value = statuses;

    } catch (error) {
        showFeedback('Não foi possível carregar dados do Gestão Click ou do Catálogo de Estampas.', 'error');
        console.error("Erro na busca de dados iniciais:", error);
    } finally {
        loadingGestaoClickProducts.value = false;
        loadingGestaoClickServices.value = false;
    }
};

const handleClientCreated = (newClient: Client) => {
  clientList.value.unshift(newClient);
  orderHeader.customer_id = newClient.id;
  showClientModal.value = false;
  showFeedback(`Cliente "${newClient.nome}" cadastrado com sucesso!`, 'success');
};
const fetchNextOrderNumber = async () => {
    loadingNextOrderNumber.value = true;
    try {
        const { data, error } = await supabase.rpc('get_next_order_number');
        if (error) throw error;
        nextOrderNumber.value = data;
    } catch (e) {
        console.error("Erro ao buscar próximo número do pedido:", e);
        nextOrderNumber.value = 0;
    } finally {
        loadingNextOrderNumber.value = false;
    }
};
const uploadFile = async (file: File | Blob, bucket: string, path: string): Promise<string> => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

// --- Form and Stepper Logic ---
const handleProofFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    orderHeader.down_payment_proof_file = target.files[0];
  } else {
    orderHeader.down_payment_proof_file = null;
  }
};
const handleNewStampFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    editedItem.value.new_stamp_file = file;
    if (file) {
        editedItem.value.stamp_image_url = URL.createObjectURL(file);
    } else {
        editedItem.value.stamp_image_url = null;
    }
};
const toggleStampUpload = () => {
    isUploadingNewStamp.value = !isUploadingNewStamp.value;
    editedItem.value.stamp_ref_id = null;
    editedItem.value.stamp_ref = '';
    editedItem.value.stamp_image_url = null;
    editedItem.value.new_stamp_file = null;
};
const nextStep = async () => {
  let formToValidate: VForm | null = null;
  if (step.value === 1) formToValidate = step1Form.value;
  if (step.value === 3) formToValidate = step3Form.value;

  if (formToValidate) {
    const { valid } = await formToValidate.validate();
    if (valid && isStepValid.value) {
      if (step.value === 2) generateInstallments();
      step.value++;
    }
  } else if (isStepValid.value) {
    if (step.value === 2) generateInstallments();
    step.value++;
  }
};
const prepareNewItem = async () => {
  editedItem.value = createNewItem();
  editedItemIndex.value = null;
  isUploadingNewStamp.value = false;
  overridePrice.value = false;
  tempMeters.value = null;
  await nextTick();
  itemForm.value?.resetValidation();
};
const editItem = (index: number) => {
  editedItemIndex.value = index;
  const itemToEdit = structuredClone(toRaw(orderItems.value[index]));
  editedItem.value = itemToEdit;
  isUploadingNewStamp.value = false;
};
const removeItem = (index: number) => {
  orderItems.value.splice(index, 1);
  if (editedItemIndex.value === index) {
    prepareNewItem();
  } else if (editedItemIndex.value !== null && editedItemIndex.value > index) {
    editedItemIndex.value--;
  }
};
const saveOrUpdateItem = async () => {
  if (itemForm.value) {
    const { valid } = await itemForm.value.validate();
    if (!valid || !isItemFormValid.value) {
      showFeedback('Por favor, preencha todos os campos obrigatórios e selecione uma estampa válida.', 'error');
      return;
    }
  }

  const rawItem = toRaw(editedItem.value);
  if (rawItem.unit_of_measure === 'kg' && rawItem.rendimento && rawItem.quantity) {
    rawItem.quantity_meters = rawItem.quantity * rawItem.rendimento;
  } else {
    rawItem.quantity_meters = rawItem.quantity;
  }

  if (isEditing.value && editedItemIndex.value !== null) {
    orderItems.value[editedItemIndex.value] = structuredClone(rawItem);
  } else {
    orderItems.value.push(structuredClone(rawItem));
  }
  await prepareNewItem();
};

const generateInstallments = () => {
  paymentDetails.installments = [];
  const total = totalOrderValue.value;
  if (total <= 0) return;

  if (paymentDetails.type === 'vista') {
    paymentDetails.installments.push({
      due_date: paymentDetails.first_due_date,
      value: total,
      payment_method_id: paymentDetails.installment_payment_method_id,
    });
    return;
  }

  const count = paymentDetails.installments_count;
  if (count <= 0) return;

  const valuePerInstallment = parseFloat((total / count).toFixed(2));
  let remainder = total - (valuePerInstallment * count);

  for (let i = 0; i < count; i++) {
    const dueDate = addDays(new Date(paymentDetails.first_due_date), i * paymentDetails.installments_interval);
    let value = valuePerInstallment;
    if (i === 0) {
        value = parseFloat((value + remainder).toFixed(2));
    }
    paymentDetails.installments.push({
      due_date: format(dueDate, 'yyyy-MM-dd'),
      value: value,
      payment_method_id: paymentDetails.installment_payment_method_id,
    });
  }
};

const handleInstallmentValueChange = (changedIndex: number, newValue: string | number) => {
    const numericValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
    if (isNaN(numericValue) || paymentDetails.installments.length <= 1) return;

    const changedValue = numericValue;
    const total = totalOrderValue.value;

    // Calcula o total já preenchido, excluindo a parcela que está sendo alterada
    let filledTotal = 0;
    paymentDetails.installments.forEach((inst, index) => {
        if (index !== changedIndex) {
            filledTotal += inst.value || 0;
        }
    });

    // O valor restante a ser distribuído
    const remainingValue = total - changedValue;
    const remainingInstallments = paymentDetails.installments.length - 1;

    if (remainingInstallments > 0) {
        const valuePerInstallment = parseFloat((remainingValue / remainingInstallments).toFixed(2));
        let remainder = remainingValue - (valuePerInstallment * remainingInstallments);

        let firstUnchangedFound = false;
        paymentDetails.installments.forEach((inst, index) => {
            if (index !== changedIndex) {
                let newValue = valuePerInstallment;
                if (!firstUnchangedFound) {
                    newValue = parseFloat((newValue + remainder).toFixed(2));
                    firstUnchangedFound = true;
                }
                inst.value = newValue;
            }
        });
    }
};


// --- Submission and Reset Logic ---
const sanitizeName = (name: string) => name.replace(/\s/g, '_').replace(/[^\w.\-]/g, '');

const syncOrderWithGestaoClick = async (proofPublicUrl: string | null) => {
    if (!orderHeader.customer_id) throw new Error("ID do cliente não encontrado.");
    const situacao = saleStatuses.value.find(s => s.nome.toLowerCase() === 'em aberto') || saleStatuses.value[0];
    if (!situacao) throw new Error("Situação de venda 'em aberto' não encontrada.");

    let observations = orderHeader.observation || '';
    if (proofPublicUrl) {
        observations += `\nComprovante de entrada disponível em: ${proofPublicUrl}`;
    }

    // <<< --- ALTERAÇÃO APLICADA AQUI --- >>>
    const salePayload: any = {
        cliente_id: orderHeader.customer_id,
        situacao_id: situacao.id,
        condicao_pagamento: paymentDetails.type,
        observacoes: observations.trim(),
        produtos: orderItems.value.map(item => {
            const product = gestaoClickProducts.value.find(p => p.nome === item.fabric_type);
            if (!product) throw new Error(`Produto ${item.fabric_type} não encontrado no Gestão Click.`);
            return { produto: { produto_id: product.id, quantidade: item.quantity || 0, valor_venda: (item.valor_unitario || 0).toFixed(2) } };
        }),
        servicos: orderItems.value.map(item => ({
            servico: { servico_id: item.stamp_ref_id!, quantidade: 1, valor_venda: "0.00" }
        })),
        pagamentos: paymentDetails.installments.map(inst => ({
            pagamento: {
                data_vencimento: inst.due_date,
                valor: inst.value.toFixed(2),
                forma_pagamento_id: inst.payment_method_id
            }
        }))
    };
    // <<< --- FIM DA ALTERAÇÃO --- >>>

    if (userStore.profile?.gestao_click_id) {
        salePayload.vendedor_id = userStore.profile.gestao_click_id;
    }

    await gestaoApi.cadastrarVenda(salePayload);

    for (const item of orderItems.value) {
        const product = gestaoClickProducts.value.find(p => p.nome === item.fabric_type);
        if (product) {
            const currentStock = parseFloat(product.estoque as string);
            const quantityUsed = item.quantity || 0;
            const newStock = currentStock - quantityUsed;
            await gestaoApi.atualizarEstoqueProduto(product.id, newStock);
            const stockItem = stockItems.value.find(s => s.gestao_click_id === product.id);
            if (stockItem) {
                const { error } = await supabase.rpc('increment', { table_name: 'stock', row_id: stockItem.id, x: -quantityUsed });
                if (error) console.error(`Falha ao debitar estoque de ${stockItem.fabric_type} no Supabase:`, error);
                if (stockItem.low_stock_threshold && newStock < stockItem.low_stock_threshold) {
                    appStore.triggerLowStockAlert(stockItem.fabric_type, newStock);
                }
            }
        }
    }
};


const submitLaunch = async () => {
  if (orderItems.value.length === 0) {
    showFeedback('Adicione pelo menos um item ao lançamento.', 'error');
    return;
  }
  isSubmitting.value = true;
  feedback.message = '';
  try {
    for (const item of orderItems.value) {
      if (item.new_stamp_file) {
        const newService = await gestaoApi.cadastrarServico(item.stamp_ref);
        const filePath = `${Date.now()}-${sanitizeName(item.new_stamp_file.name)}`;
        const imageUrl = await uploadFile(item.new_stamp_file, 'stamp-library', filePath);
        const { error: stampError } = await supabase.from('stamp_library').insert({
          gestao_click_service_id: newService.id, name: item.stamp_ref, image_url: imageUrl, is_approved_for_sale: false,
        });
        if (stampError) throw stampError;
        item.stamp_ref_id = newService.id;
        item.stamp_image_url = imageUrl;
      }
    }

    const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id);
    if (!selectedClient) throw new Error("Cliente selecionado não encontrado na lista.");

    let proofPublicUrl: string | null = null;
    if (orderHeader.has_down_payment && orderHeader.down_payment_proof_file) {
      const file = orderHeader.down_payment_proof_file;
      const baseName = sanitizeName(file.name);
      const filePath = `proofs/${Date.now()}-${baseName}`;
      proofPublicUrl = await uploadFile(file, 'proofs', filePath);
    }

    // Passa a URL do comprovante para a função de sincronização
    await syncOrderWithGestaoClick(proofPublicUrl);

    const itemsPayload = orderItems.value.map(item => ({
        fabric_type: item.fabric_type, stamp_ref: item.stamp_ref, quantity_meters: item.quantity_meters,
        stamp_image_url: item.stamp_image_url, design_tag: item.design_tag, notes: item.notes,
        quantity_unit: item.quantity, unit_of_measure: item.unit_of_measure, rendimento: item.rendimento,
    }));

    const { data: newOrderNumber, error: rpcError } = await supabase.rpc('create_launch_order', {
      p_customer_name: selectedClient.nome, p_created_by: userStore.profile?.id, p_store_id: userStore.profile?.store_id,
      p_has_down_payment: orderHeader.has_down_payment, p_down_payment_proof_url: proofPublicUrl, p_order_items: itemsPayload
    });

    if (rpcError) throw rpcError;
    const { data: orderData } = await supabase.from('orders').select('id').eq('order_number', newOrderNumber).single();
    if (orderData) createdOrderId.value = orderData.id;
    createdOrderNumber.value = newOrderNumber;
    orderCreatedSuccess.value = true;
    showFeedback("Pedido criado e sincronizado com sucesso!", "success");
  } catch (error: any) {
    console.error('Erro ao criar lançamento:', error);
    let errorMessage = error.message || 'Erro desconhecido.';
    if (errorMessage.includes('Gestão Click')) {
        errorMessage = `Falha na integração com o sistema de gestão: ${errorMessage}`;
    }
    showFeedback(`Erro ao criar lançamento: ${errorMessage}`, 'error');
  } finally {
    isSubmitting.value = false;
  }
};


const resetForm = () => {
  orderHeader.customer_id = null;
  orderHeader.customer_name = '';
  orderHeader.has_down_payment = false;
  orderHeader.down_payment_proof_file = null;
  orderHeader.observation = '';
  paymentDetails.type = 'vista';
  paymentDetails.installments = [];
  paymentDetails.installments_interval = 30; // Reseta para o padrão
  clientSearch.value = '';
  clientList.value = [];
  orderItems.value = [];
  prepareNewItem();
  step.value = 1;
  orderCreatedSuccess.value = false;
  createdOrderId.value = null;
  createdOrderNumber.value = null;
  fetchNextOrderNumber();
  fetchInitialData();
};

const showFeedback = (message: string, type: 'success' | 'error') => {
  feedback.message = message;
  feedback.type = type;
};

const formatCurrency = (value: number | undefined | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const imageToBase64 = (url: string): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
});

const generateAndUploadQuotePdf = async () => {
    isGeneratingPdf.value = true;
    try {
        const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id) || { nome: 'Cliente Desconhecido' };

        const itemDetailsWithPrice = orderItems.value.map(item => {
            const price = item.valor_unitario || 0;
            const quantityForCalc = item.quantity || 0;
            const total = quantityForCalc * price;
            return {
                base: item.fabric_type, estampa: item.stamp_ref, quantidade: `${item.quantity}${item.unit_of_measure}`,
                rendimento: item.unit_of_measure === 'kg' ? `~ ${item.quantity_meters?.toFixed(2)}m` : '-',
                valorUnit: formatCurrency(price), valorTotal: formatCurrency(total)
            };
        });

        const grandTotal = itemDetailsWithPrice.reduce((sum, item) => sum + parseFloat(item.valorTotal.replace('R$', '').replace(/\./g, '').replace(',', '.')), 0);
        const doc = new jsPDF();
        const { width: pageWidth, height: pageHeight } = doc.internal.pageSize;
        const logoUrl = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713';
        const logoBase64 = await imageToBase64(logoUrl);
        const logoProps = doc.getImageProperties(logoBase64);
        const logoWidth = 50;
        const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
        doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);
        doc.setFontSize(18).setFont('helvetica', 'bold').text(`Pedido #${String(createdOrderNumber.value).padStart(4, '0')}`, pageWidth - 15, 25, { align: 'right' });
        autoTable(doc, {
            startY: 40,
            head: [['CLIENTE', 'VENDEDOR', 'DATA DE EMISSÃO']],
            body: [[selectedClient.nome, userStore.profile?.full_name || 'N/A', format(new Date(), 'dd/MM/yyyy', { locale: ptBR })]],
            theme: 'striped',
        });
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Base', 'Estampa', 'Quantidade', 'Rendimento', 'Valor Unit.', 'Valor Total']],
            body: itemDetailsWithPrice.map(i => [i.base, i.estampa, i.quantidade, i.rendimento, i.valorUnit, i.valorTotal]),
            theme: 'grid',
            foot: [['', '', '', '', 'Total do Pedido:', formatCurrency(grandTotal)]],
            footStyles: { fontStyle: 'bold', fontSize: 11, halign: 'right' },
            didDrawPage: () => {
                const signatureY = pageHeight - 40;
                doc.setLineWidth(0.5).setDrawColor(100, 100, 100).line(40, signatureY, pageWidth - 40, signatureY);
                doc.setFontSize(10).setTextColor(100).text(`Assinatura do Cliente: ${selectedClient.nome}`, pageWidth / 2, signatureY + 5, { align: 'center' });
            }
        });
        const pdfBlob = doc.output('blob');
        const pdfFileName = `Pedido_${String(createdOrderNumber.value).padStart(4, '0')}_${selectedClient.nome}.pdf`;
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        const pdfPath = `sales_orders/${pdfFileName}`;
        const publicUrl = await uploadFile(pdfBlob, 'sales-orders', pdfPath);
        const { error: updateError } = await supabase.from('orders').update({ sales_order_pdf_url: publicUrl }).eq('id', createdOrderId.value);
        if (updateError) throw updateError;
        showFeedback('Orçamento em PDF gerado, baixado e anexado com sucesso!', 'success');
    } catch (error: any) {
        console.error("Erro ao gerar PDF do orçamento:", error);
        showFeedback(`Erro ao gerar PDF: ${error.message}`, 'error');
    } finally {
        isGeneratingPdf.value = false;
    }
}

// --- Lifecycle Hooks ---
onMounted(() => {
    fetchNextOrderNumber();
    fetchInitialData();
});
</script>

<style scoped lang="scss">
.glassmorphism-card-order {
  backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.stepper-transparent {
  background-color: transparent !important;
  box-shadow: none !important;
  :deep(.v-stepper-item__title) { color: rgba(255, 255, 255, 0.8) !important; }
  :deep(.v-stepper-item--selected .v-stepper-item__title) { color: white !important; }
  :deep(.v-sheet) { background-color: transparent !important; box-shadow: none !important; }
}
.item-list-card {
  background-color: rgba(255, 255, 255, 0.05);
  height: 100%;
}
.item-form-card {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
</style>
