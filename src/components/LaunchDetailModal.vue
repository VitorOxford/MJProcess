<template>
  <div>
    <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="95%" width="1700px" persistent>
      <v-card class="glassmorphism-card">
        <v-toolbar color="transparent">
          <v-toolbar-title class="font-weight-bold">Gerenciar Lançamento</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-tooltip location="bottom">
            <template #activator="{ props }">
              <v-btn v-bind="props" :icon="hintsEnabled ? 'mdi-lightbulb-on-outline' : 'mdi-lightbulb-off-outline'" variant="text" @click="toggleHints" :color="hintsEnabled ? 'amber' : ''"/>
            </template>
            <span>{{ hintsEnabled ? 'Desativar Dicas Visuais' : 'Ativar Dicas Visuais' }}</span>
          </v-tooltip>
          <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
        </v-toolbar>

        <div v-if="loading" class="loading-container">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>

        <v-card-text v-else-if="order" class="pa-md-4 pa-2">
           <div class="header-info-v2 mb-6">
            <div class="client-info">
                <span class="text-caption text-grey">CLIENTE</span>
                <h2 class="text-h5 font-weight-bold">{{ order.customer_name }}</h2>
            </div>
            <div class="seller-info">
                <v-icon start>mdi-account-tie-outline</v-icon>
                <span class="font-weight-medium">{{ order.created_by.full_name }}</span>
            </div>
          </div>

           <div v-if="focusedItem" class="focused-item-section mb-6">
             <div class="card-flipper" :class="{ 'is-flipped': focusedItem.isEditMode }">
                <div class="card-face card-front">
                  <v-card class="item-card-focused" variant="flat">
                     <div class="card-menu-container">
                        <v-menu location="bottom end" transition="scale-transition">
                          <template #activator="{ props }">
                            <v-btn v-bind="props" icon="mdi-dots-vertical" size="small" variant="text" class="menu-icon-btn"></v-btn>
                          </template>
                          <v-list class="glass-menu" density="compact" nav>
                             <v-list-item v-if="isReadyForProductionFlow(focusedItem)" @click.prevent="toggleOpGenerated(focusedItem)" prepend-icon="mdi-checkbox-marked-circle-outline">
                               <v-list-item-title>{{ focusedItem.is_op_generated ? 'OP Liberada' : 'Liberar OP' }}</v-list-item-title>
                               <template #prepend>
                                  <v-icon :color="focusedItem.is_op_generated ? 'success' : 'grey-lighten-1'"></v-icon>
                               </template>
                             </v-list-item>
                             <v-list-item @click="toggleEditMode(focusedItem)" prepend-icon="mdi-pencil-outline">
                              <v-list-item-title>Editar Item</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="emit('sendToSeller', focusedItem)" prepend-icon="mdi-send-check-outline">
                              <v-list-item-title>Enviar para Aprovação</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="confirmDeleteItem(focusedItem)" prepend-icon="mdi-delete-outline" base-color="error">
                              <v-list-item-title>Excluir Item</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                      </div>
                    <v-row no-gutters>
                      <v-col cols="12" md="4">
                         <v-img :src="getImagePreview(focusedItem)" class="item-thumbnail-focused" aspect-ratio="1" cover @click="openImageModal(getImagePreview(focusedItem), focusedItem.stamp_ref)"/>
                      </v-col>
                      <v-col cols="12" md="8" class="d-flex flex-column">
                        <v-card-text class="flex-grow-1">
                          <div class="d-flex align-center mb-2">
                            <h4 class="text-h5 font-weight-bold">{{ focusedItem.stamp_ref }}</h4>
                          </div>
                          <div class="info-chips-group mb-4">
                              <v-chip color="primary" label size="small" prepend-icon="mdi-layers-triple-outline" variant="tonal">{{ focusedItem.fabric_type }}</v-chip>
                              <v-chip color="teal" label size="small" prepend-icon="mdi-ruler-square" variant="tonal">{{ focusedItem.quantity_meters }}m</v-chip>
                              <v-chip :color="tagColorMap[focusedItem.design_tag]" size="small" label>{{ focusedItem.design_tag }}</v-chip>
                              <v-chip v-if="focusedItem.status === 'customer_approval'" color="orange" size="small" label>Aguardando Vendedor</v-chip>
                          </div>
                          <p v-if="focusedItem.notes" class="notes-full-view">"{{ focusedItem.notes }}"</p>
                          <p v-else class="text-caption text-grey-lighten-1">Nenhuma observação.</p>
                        </v-card-text>
                        <v-card-actions class="pa-4">
                           <v-btn v-if="!isItemApprovedBySeller(focusedItem.status) && focusedItem.status !== 'customer_approval'" :color="focusedItem.design_tag === 'Aprovado' || focusedItem.design_tag === 'Finalização' ? 'teal' : 'primary'" @click="focusedItem.design_tag === 'Aprovado' || focusedItem.design_tag === 'Finalização' ? emit('releaseItem', focusedItem) : emit('sendToSeller', focusedItem)" size="small" variant="tonal" class="action-btn">
                                {{ focusedItem.design_tag === 'Aprovado' || focusedItem.design_tag === 'Finalização' ? 'Liberar' : 'Enviar' }}
                            </v-btn>
                            <v-btn v-if="isItemApprovedBySeller(focusedItem.status)" color="primary" variant="tonal" size="small" @click="emit('releaseItem', focusedItem)" class="action-btn">
                                Liberar Item
                            </v-btn>
                        </v-card-actions>
                      </v-col>
                    </v-row>
                  </v-card>
                </div>
                <div class="card-face card-back">
                    <v-card class="item-card-focused" variant="flat">
                       <v-card-text>
                          <h4 class="text-h6 mb-4">Editando: {{ focusedItem.stamp_ref }}</h4>
                           <v-text-field v-model="focusedItem.stamp_ref" label="Referência (Estampa)" variant="outlined" density="compact" hide-details class="mb-3 elegant-field" :readonly="!isAdmin && !isDesigner"></v-text-field>
                           <v-autocomplete v-model="focusedItem.fabric_type" :items="gestaoClickProducts" item-title="nome" item-value="nome" label="Base" variant="outlined" density="compact" hide-details class="mb-3 elegant-field" :readonly="!isAdmin"></v-autocomplete>
                           <v-text-field v-model.number="focusedItem.quantity_meters" label="Metragem" type="number" variant="outlined" density="compact" hide-details class="mb-3 elegant-field" :readonly="!isAdmin" suffix="m"></v-text-field>
                           <v-textarea v-model="focusedItem.notes" label="Observações" variant="outlined" density="compact" hide-details rows="2" auto-grow class="mb-3 elegant-field" :readonly="!isAdmin"></v-textarea>
                          <v-file-input v-if="isAdmin || isDesigner" @change="(event) => handleFileChange(event, focusedItem)" label="Trocar Anexo" variant="outlined" density="compact" hide-details accept="image/*" class="elegant-field"></v-file-input>
                       </v-card-text>
                       <v-card-actions class="pa-4">
                          <v-spacer></v-spacer>
                          <v-btn @click="toggleEditMode(focusedItem)" size="small" variant="text" class="action-btn mr-2">Cancelar</v-btn>
                          <v-btn color="success" @click="saveItem(focusedItem)" :loading="isSaving[focusedItem.id]" size="small" variant="flat" class="action-btn">Salvar Alterações</v-btn>
                       </v-card-actions>
                    </v-card>
                </div>
             </div>
          </div>
          <v-divider v-if="focusedItem && otherItems.length > 0" class="mb-4"></v-divider>
           <h3 v-if="focusedItem && otherItems.length > 0" class="text-h6 font-weight-bold mb-4">Outros Itens do Lançamento</h3>

          <transition-group name="card-list" tag="v-row" class="v-row">
            <v-col v-for="(item, idx) in otherItems" :key="item.id" cols="12" sm="6" md="4" lg="3" xl="2_4">
              <div class="card-flipper" :class="{ 'is-flipped': item.isEditMode }">

                <div class="card-menu-container" :class="{ 'highlight-menu': showEditHint && idx === 0 && hintsEnabled }">
                  <transition name="hint-bounce">
                    <div v-if="showEditHint && idx === 0 && hintsEnabled" class="edit-hint-bubble">
                      <v-icon start size="small">mdi-gesture-tap-button</v-icon>
                      Clique para opções
                    </div>
                  </transition>

                  <v-menu location="bottom end" transition="scale-transition" @open="onMenuOpen(idx)">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-dots-vertical" size="small" variant="text" class="menu-icon-btn"></v-btn>
                    </template>
                    <v-list class="glass-menu" density="compact" nav>
                      <v-list-item v-if="isReadyForProductionFlow(item)" @click.prevent="toggleOpGenerated(item)" prepend-icon="mdi-checkbox-marked-circle-outline">
                        <v-list-item-title>{{ item.is_op_generated ? 'OP Liberada' : 'Liberar OP' }}</v-list-item-title>
                         <template #prepend>
                            <v-icon :color="item.is_op_generated ? 'success' : 'grey-lighten-1'"></v-icon>
                        </template>
                      </v-list-item>
                      <v-list-item @click="toggleEditMode(item)" prepend-icon="mdi-pencil-outline">
                        <v-list-item-title>{{ item.isEditMode ? 'Concluir Edição' : 'Editar Item' }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="emit('sendToSeller', item)" prepend-icon="mdi-send-check-outline">
                        <v-list-item-title>Enviar para Aprovação</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="confirmDeleteItem(item)" prepend-icon="mdi-delete-outline" base-color="error">
                        <v-list-item-title>Excluir Item</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>

                <div class="card-face card-front">
                    <div class="item-card-final" @mousemove="onCardMouseMove">
                        <div class="card-glow"></div>
                        <div class="card-border"></div>
                        <div class="item-card-header">
                            <v-img :src="getImagePreview(item)" class="item-thumbnail" aspect-ratio="1" cover @click="openImageModal(getImagePreview(item), item.stamp_ref)"/>
                        </div>
                        <div class="item-card-body-view">
                            <h4 class="text-h6 font-weight-bold text-truncate">{{ item.stamp_ref }}</h4>
                        </div>
                        <v-divider></v-divider>
                        <div class="item-card-actions">
                            <div class="info-chips-group">
                                <v-chip color="primary" label size="small" prepend-icon="mdi-layers-triple-outline" variant="tonal">
                                    {{ item.fabric_type }}
                                </v-chip>
                                <v-chip color="teal" label size="small" prepend-icon="mdi-ruler-square" variant="tonal">
                                    {{ item.quantity_meters }}m
                                </v-chip>
                            </div>
                            <v-spacer></v-spacer>
                            <div class="actions-right">
                               <v-chip v-if="item.status === 'customer_approval'" color="orange" variant="flat" size="small" label>
                                Aguardando Vendedor
                              </v-chip>
                              <v-chip
                                v-else-if="isItemInProduction(item.status)"
                                color="cyan-darken-1"
                                variant="flat"
                                size="small"
                                label
                              >
                                <v-icon start>mdi-send-check</v-icon>
                                Em Produção
                              </v-chip>

                              <template v-else>
                                <v-btn v-if="!isItemApprovedBySeller(item.status) && item.status !== 'customer_approval'" :color="item.design_tag === 'Aprovado' || item.design_tag === 'Finalização' ? 'teal' : 'primary'" @click="item.design_tag === 'Aprovado' || item.design_tag === 'Finalização' ? emit('releaseItem', item) : emit('sendToSeller', item)" size="small" variant="tonal" class="action-btn">
                                    {{ item.design_tag === 'Aprovado' || item.design_tag === 'Finalização' ? 'Liberar' : 'Enviar' }}
                                </v-btn>
                                <v-btn v-if="isItemApprovedBySeller(item.status)" color="primary" variant="tonal" size="small" @click="emit('releaseItem', item)" class="action-btn">
                                    Liberar Item
                                </v-btn>
                              </template>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card-face card-back">
                    <div class="item-card-final">
                        <div class="item-card-body-edit">
                            <v-text-field v-model="item.stamp_ref" label="Referência (Estampa)" variant="outlined" density="compact" hide-details class="mb-3 elegant-field" :readonly="!isAdmin && !isDesigner"></v-text-field>
                            <v-autocomplete v-model="item.fabric_type" :items="gestaoClickProducts" item-title="nome" item-value="nome" label="Base" variant="outlined" density="compact" hide-details class="mb-3 elegant-field" :readonly="!isAdmin"></v-autocomplete>
                            <v-text-field v-model.number="item.quantity_meters" label="Metragem" type="number" variant="outlined" density="compact" hide-details class="mb-3 elegant-field" :readonly="!isAdmin" suffix="m"></v-text-field>
                            <v-textarea v-model="item.notes" label="Observações" variant="outlined" density="compact" hide-details rows="2" auto-grow class="mb-3 elegant-field" :readonly="!isAdmin"></v-textarea>
                            <v-file-input v-if="isAdmin || isDesigner" @change="(event) => handleFileChange(event, item)" label="Trocar Anexo" variant="outlined" density="compact" hide-details accept="image/*" class="elegant-field"></v-file-input>
                        </div>
                        <v-divider></v-divider>
                        <div class="item-card-actions">
                            <v-spacer></v-spacer>
                            <v-btn @click="toggleEditMode(item)" size="small" variant="text" class="action-btn mr-2">Cancelar</v-btn>
                            <v-btn color="success" @click="saveItem(item)" :loading="isSaving[item.id]" size="small" variant="flat" class="action-btn">Salvar Alterações</v-btn>
                        </div>
                    </div>
                </div>
              </div>
            </v-col>
          </transition-group>
        </v-card-text>
      </v-card>
    </v-dialog>

    <VariationConfirmationModal
      :show="showVariationModal"
      :new-item-name="itemToProcess ? itemToProcess.stamp_ref : ''"
      @decision="handleVariationDecision"
    />

    <ImageModal :show="showImageModal" :image-url="selectedImageUrl" :file-name="selectedImageName" @close="showImageModal = false" />
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="top right">{{ snackbar.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, reactive, nextTick } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import ImageModal from './ImageModal.vue';
import { gestaoApi } from '@/api/gestaoClick';
import VariationConfirmationModal from './design/VariationConfirmationModal.vue';

const props = defineProps({
  show: Boolean,
  orderId: String,
  itemId: String,
});
const emit = defineEmits(['close', 'sendToSeller', 'releaseItem', 'itemUpdated']);

type GestaoClickProduct = { id: string; nome: string; };
type GestaoClickService = { id: string; nome: string; imagem_url?: string };
type OrderItemEditable = {
    id: string;
    stamp_ref_id: string;
    stamp_ref: string;
    fabric_type: string;
    quantity_meters: number;
    notes: string | null;
    stamp_image_url: string;
    status: string;
    design_tag: string;
    is_op_generated: boolean;
    isEditMode: boolean;
    new_stamp_file?: File | null;
    local_image_preview?: string | null;
};

const showVariationModal = ref(false);
const itemToProcess = ref<OrderItemEditable | null>(null);
const originalItemState = ref<OrderItemEditable | null>(null);

const userStore = useUserStore();
const order = ref<any | null>(null);
const loading = ref(false);
const showImageModal = ref(false);
const selectedImageUrl = ref<string | undefined>('');
const selectedImageName = ref<string | undefined>('');
const editableItems = ref<OrderItemEditable[]>([]);
const isSaving = ref<Record<string, boolean>>({});
const snackbar = reactive({ show: false, text: '', color: '' });
const gestaoClickProducts = ref<GestaoClickProduct[]>([]);
const gestaoClickServices = ref<GestaoClickService[]>([]);
const stampLibrary = ref<any[]>([]);
const hintsEnabled = ref(JSON.parse(localStorage.getItem('showTutorialHints') ?? 'true'));
const showEditHint = ref(false);
let hintTimeout: any = null;

const isAdmin = computed(() => userStore.profile?.role === 'admin');
const isDesigner = computed(() => userStore.profile?.role === 'designer');
const canEdit = computed(() => isAdmin.value || isDesigner.value);

const focusedItem = computed(() => props.itemId ? editableItems.value.find(item => item.id === props.itemId) : null);
const otherItems = computed(() => focusedItem.value ? editableItems.value.filter(item => item.id !== focusedItem.value!.id) : editableItems.value);
const tagColorMap = { 'Desenvolvimento': '#40c4ff', 'Alteração': '#ffab40', 'Finalização': '#26A69A', 'Aprovado': '#4CAF50' };

const toggleHints = () => {
  hintsEnabled.value = !hintsEnabled.value;
  localStorage.setItem('showTutorialHints', JSON.stringify(hintsEnabled.value));
  if (!hintsEnabled.value) showEditHint.value = false;
};

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

const fetchOrderDetails = async (id: string) => {
  if (!id) return;
  loading.value = true;
  order.value = null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, created_by:profiles!created_by(full_name), order_items(*)')
      .eq('id', id).single();
    if (error) throw error;
    order.value = data;
    editableItems.value = JSON.parse(JSON.stringify(data.order_items.sort((a: any, b: any) => a.stamp_ref.localeCompare(b.stamp_ref))))
      .map((item: any) => ({ ...item, isEditMode: false }));
  } catch (err) {
    showSnackbar('Falha ao carregar detalhes do pedido', 'error');
  } finally {
    loading.value = false;
  }
};

const fetchGestaoData = async () => {
    try {
        const [products, services, stampsResponse] = await Promise.all([
            gestaoApi.buscarProdutos(),
            gestaoApi.buscarServicos(),
            supabase.from('stamp_library').select('*')
        ]);
        if (stampsResponse.error) throw stampsResponse.error;
        stampLibrary.value = stampsResponse.data || [];
        gestaoClickProducts.value = products.map(p => ({ id: p.id, nome: p.nome }));
        const approvedStampServiceIds = new Set(stampLibrary.value.map(s => s.gestao_click_service_id));
        gestaoClickServices.value = services
            .filter(service => approvedStampServiceIds.has(service.id))
            .map(service => {
                const matchingStamp = stampLibrary.value.find(s => s.gestao_click_service_id === service.id);
                return { id: service.id, nome: service.nome, imagem_url: matchingStamp ? matchingStamp.image_url : undefined };
            });
    } catch (error) { console.error("Erro ao buscar dados do Gestão Click:", error); }
}

const getImagePreview = (item: OrderItemEditable) => item.local_image_preview || item.stamp_image_url;

const handleFileChange = (event: Event, item: OrderItemEditable) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    item.new_stamp_file = file;
    item.local_image_preview = URL.createObjectURL(file);
  }
};

const toggleEditMode = (item: OrderItemEditable) => {
  item.isEditMode = !item.isEditMode;
  if (item.isEditMode) {
    originalItemState.value = { ...item };
  } else {
    const original = editableItems.value.find(i => i.id === item.id);
    if (original && originalItemState.value) {
        Object.assign(original, originalItemState.value);
    }
    originalItemState.value = null;
  }
};

const showSnackbar = (text: string, color: 'success' | 'error' | 'info') => {
    snackbar.text = text;
    snackbar.color = color;
    snackbar.show = true;
};

const openImageModal = (url: string, name: string) => {
  selectedImageUrl.value = url;
  selectedImageName.value = name;
  showImageModal.value = true;
};

const saveItem = (item: OrderItemEditable) => {
    if (!canEdit.value) return;
    const refChanged = item.stamp_ref !== originalItemState.value?.stamp_ref;
    const isAlterationWithNewFile = originalItemState.value?.design_tag === 'Alteração' && !!item.new_stamp_file;

    if (refChanged || isAlterationWithNewFile) {
        itemToProcess.value = item;
        showVariationModal.value = true;
    } else {
        proceedWithSave(item, 'update_only');
    }
};

const handleVariationDecision = async (decision: 'new_variation' | 'name_correction') => {
    const item = itemToProcess.value;
    if (!item || !originalItemState.value) return;

    isSaving.value[item.id] = true;
    showVariationModal.value = false;

    try {
        if (decision === 'new_variation') {
            const { data: existingStampByName } = await supabase.from('stamp_library').select('id').eq('name', item.stamp_ref).maybeSingle();
            if (existingStampByName) throw new Error(`A referência "${item.stamp_ref}" já existe. Use um nome único.`);

            const newService = await gestaoApi.cadastrarServico(item.stamp_ref);
            let imageUrl = item.stamp_image_url;
            let fileToUpload: File | string | undefined | null = item.new_stamp_file || imageUrl;

            if (fileToUpload) {
                const filePath = `${Date.now()}-${item.stamp_ref.replace(/\s/g, '_')}`;
                let uploadable: File | Blob;
                if (typeof fileToUpload === 'string') {
                    const response = await fetch(fileToUpload);
                    uploadable = await response.blob();
                } else {
                    uploadable = fileToUpload;
                }
                await supabase.storage.from('stamp-library').upload(filePath, uploadable);
                imageUrl = supabase.storage.from('stamp-library').getPublicUrl(filePath).data.publicUrl;
            }

            const { data: newStampData, error: insertError } = await supabase.from('stamp_library').insert({
                gestao_click_service_id: newService.id, name: item.stamp_ref, image_url: imageUrl, is_approved_for_sale: false,
            }).select().single();
            if (insertError) throw insertError;

            await proceedWithSave(item, decision, newStampData);
        } else {
            if (item.stamp_ref !== originalItemState.value.stamp_ref) {
              const { data: originalStamp, error: stampError } = await supabase
                .from('stamp_library')
                .select('gestao_click_service_id')
                .eq('name', originalItemState.value.stamp_ref)
                .single();
              if (stampError || !originalStamp) throw new Error(`Estampa original "${originalItemState.value.stamp_ref}" não encontrada.`);

              const gestaoClickId = originalStamp.gestao_click_service_id;

              await gestaoApi.atualizarServico(gestaoClickId, item.stamp_ref);
              await supabase.from('stamp_library').update({ name: item.stamp_ref }).eq('gestao_click_service_id', gestaoClickId);
            }
            await proceedWithSave(item, decision);
        }
    } catch (err: any) {
        showSnackbar(err.message, 'error');
        isSaving.value[item.id] = false;
    }
};

const proceedWithSave = async (item: OrderItemEditable, decision?: string, newStampData?: any) => {
    isSaving.value[item.id] = true;
    try {
        let imageUrl = item.stamp_image_url;
        if (item.new_stamp_file && decision !== 'name_correction') {
             const file = item.new_stamp_file;
             const filePath = `${order.value.id}/${item.id}/${Date.now()}-${file.name}`;
             await supabase.storage.from('arts').upload(filePath, file, { upsert: true });
             imageUrl = supabase.storage.from('arts').getPublicUrl(filePath).data.publicUrl;
        }

        const payload = {
            stamp_ref: item.stamp_ref,
            fabric_type: item.fabric_type,
            quantity_meters: item.quantity_meters,
            notes: item.notes,
            stamp_image_url: (decision === 'new_variation' && newStampData) ? newStampData.image_url : imageUrl,
        };

        const { error } = await supabase.from('order_items').update(payload).eq('id', item.id);
        if (error) throw error;

        const itemInState = editableItems.value.find(i => i.id === item.id);
        if (itemInState) {
            Object.assign(itemInState, payload);
        }

        showSnackbar('Item atualizado com sucesso!', 'success');
        emit('itemUpdated');
        item.isEditMode = false;
    } catch(err: any) {
        showSnackbar(`Erro ao salvar: ${err.message}`, 'error');
    } finally {
        isSaving.value[item.id] = false;
        itemToProcess.value = null;
        originalItemState.value = null;
    }
}

const confirmDeleteItem = (item: OrderItemEditable) => { if (confirm(`Tem certeza que deseja excluir o item "${item.stamp_ref}"?`)) deleteItem(item); };
const deleteItem = async (item: OrderItemEditable) => {
    if (!canEdit.value) return;
    try {
        const { error } = await supabase.from('order_items').delete().eq('id', item.id);
        if (error) throw error;
        showSnackbar('Item excluído com sucesso!', 'success');
        emit('itemUpdated');
        editableItems.value = editableItems.value.filter(i => i.id !== item.id);
        if (editableItems.value.length === 0) emit('close');
    } catch(err: any) {
        showSnackbar(`Erro ao excluir: ${err.message}`, 'error');
    }
};

const isItemApprovedBySeller = (status: string) => status === 'approved_by_seller';
const isItemInProduction = (status: string) => ['production_queue', 'in_printing', 'in_cutting', 'completed'].includes(status);
const isReadyForProductionFlow = (item: any) => isItemApprovedBySeller(item.status) || isItemInProduction(item.status) || (item.status === 'design_pending' && ['Aprovado', 'Finalização'].includes(item.design_tag));

const toggleOpGenerated = async (item: OrderItemEditable) => {
    const originalValue = item.is_op_generated;
    item.is_op_generated = !originalValue;
    try {
        const { error } = await supabase.from('order_items').update({ is_op_generated: item.is_op_generated }).eq('id', item.id);
        if (error) { item.is_op_generated = originalValue; throw error; }
        showSnackbar(`OP ${item.is_op_generated ? 'Liberada' : 'Não Liberada'}`, 'info');
        emit('itemUpdated');
    } catch (err) {
        showSnackbar("Erro ao salvar a liberação da OP.", 'error');
    }
};

const onMenuOpen = (idx: number) => {
  if (idx === 0) {
    showEditHint.value = false;
    if (hintTimeout) clearTimeout(hintTimeout);
  }
};

watch(() => props.orderId, (newId) => { if (newId && props.show) fetchOrderDetails(newId); });
watch(() => props.show, (newVal) => {
    if (newVal && gestaoClickProducts.value.length === 0) fetchGestaoData();
    if (newVal && hintsEnabled.value) {
        nextTick(() => {
            showEditHint.value = true;
            hintTimeout = setTimeout(() => { showEditHint.value = false; }, 5000);
        });
    } else {
        showEditHint.value = false;
        if (hintTimeout) clearTimeout(hintTimeout);
        editableItems.value.forEach(item => item.isEditMode = false);
    }
});
</script>

<style scoped lang="scss">
.v-col-xl-2_4 {
  flex: 0 0 20%;
  max-width: 20%;
  padding: 12px;
}

.glassmorphism-card {
  backdrop-filter: blur(16px) saturate(180%);
  background-color: rgba(23, 24, 28, 0.85);
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 95vh;
  display: flex;
  flex-direction: column;
}

.v-card-text {
    overflow-y: auto;
}

.loading-container {
  min-height: 400px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-info-v2 {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 0.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .seller-info {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        background-color: rgba(var(--v-theme-primary-rgb), 0.1);
        border: 1px solid rgba(var(--v-theme-primary-rgb), 0.3);
        border-radius: 20px;
        font-size: 0.9rem;
    }
}

.focused-item-section {
  position: relative;
}

.item-card-focused {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px !important;
  transition: all 0.3s ease;
}

.item-thumbnail-focused {
  width: 100%;
  height: 100%;
  min-height: 250px;
  border-radius: 8px !important;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.05);
}

.notes-full-view {
  color: #e0e0e0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  background-color: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 8px;
  margin-top: 1rem;
  width: 100%;
}

.card-flipper {
    perspective: 1500px;
    position: relative;
    width: 100%;
    min-height: 380px;
    height: 100%;
}

.card-face {
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    transition: transform 0.7s cubic-bezier(0.25, 0.8, 0.25, 1);
    transform-style: preserve-3d;
}

.card-back {
    position: absolute;
    top: 0;
    transform: rotateY(180deg);
}

.card-flipper.is-flipped .card-front {
    transform: rotateY(-180deg);
}
.card-flipper.is-flipped .card-back {
    transform: rotateY(0deg);
}

.item-card-final {
  position: relative;
  background: rgba(40, 42, 53, 0.7);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1;
  height: 100%;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      400px circle at var(--mouse-x) var(--mouse-y),
      rgba(255, 255, 255, 0.08),
      transparent 80%
    );
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 2;
    pointer-events: none;
  }

  &:hover::before {
    opacity: 1;
  }
}

.card-border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.card-menu-container {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 20;
  border-radius: 50%;
  transition: box-shadow 0.3s ease-in-out;

  &.highlight-menu .menu-icon-btn {
     background-color: rgba(0, 229, 255, 0.15);
     color: rgba(0, 229, 255, 1);
  }
}

.menu-icon-btn {
    transition: background-color 0.2s ease-in-out;
}

.edit-hint-bubble {
  position: absolute;
  bottom: 110%;
  right: 50%;
  transform: translateX(50%);
  width: max-content;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  pointer-events: none;
  z-index: 20;
  text-align: center;
  color: #e0e0e0;
  backdrop-filter: blur(10px);
  background-color: rgba(30, 30, 35, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.glass-menu {
  backdrop-filter: blur(12px) saturate(150%);
  background-color: rgba(40, 42, 53, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px !important;

  .v-list-item-title {
    font-size: 0.85rem;
  }
}

.hint-bounce-enter-active { animation: hint-bounce-in 0.5s cubic-bezier(.68,-0.55,.27,1.55); }
.hint-bounce-leave-active { animation: hint-bounce-out 0.3s ease-in; }
@keyframes hint-bounce-in {
  0% { opacity: 0; transform: translateX(50%) translateY(10px) scale(0.9); }
  100% { opacity: 1; transform: translateX(50%) translateY(0) scale(1); }
}
@keyframes hint-bounce-out {
  0% { opacity: 1; transform: translateX(50%) scale(1); }
  100% { opacity: 0; transform: translateX(50%) scale(0.9); }
}

.item-card-header {
  padding: 0.75rem;
  z-index: 4;
}

.item-thumbnail {
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.05);
}

.item-card-body-view {
  padding: 0 1rem 1rem 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 4;
  min-height: 0;
}

.item-card-body-edit {
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  z-index: 4;
}

.item-card-actions {
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  z-index: 4;
  flex-shrink: 0;
  min-height: 52px;
  gap: 8px;
  width: 100%;
}

.info-chips-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.actions-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.elegant-field :deep(.v-field) {
    background-color: rgba(0,0,0,0.25) !important;
}

.action-btn {
    border-radius: 8px;
}

.card-list-leave-active {
  transition: all 0.4s ease;
  position: absolute;
}
.card-list-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.card-list-move {
  transition: transform 0.5s ease;
}
</style>
