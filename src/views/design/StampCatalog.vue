<template>
  <v-container fluid class="stamp-catalog-container pa-md-6 pa-4">
    <div class="catalog-header">
      <div class="text-center">
        <h1 class="text-h4 font-weight-bold">Catálogo de Estampas</h1>
        <p class="text-medium-emphasis mt-1">Gerencie, organize e aprove estampas para a equipe de vendas.</p>
      </div>
      <v-text-field
        v-model="search"
        placeholder="Buscar por nome ou ID do serviço..."
        variant="solo-filled"
        flat
        density="comfortable"
        prepend-inner-icon="mdi-magnify"
        hide-details
        rounded="lg"
        class="mt-6 mx-auto search-bar"
      />
      <div class="d-flex justify-center mt-4">
        <v-chip-group v-model="filterStatus" mandatory>
          <v-chip filter value="all" color="grey" size="small">Todos</v-chip>
          <v-chip filter value="approved" color="success" size="small">Aprovados</v-chip>
          <v-chip filter value="pending" color="orange" size="small">Pendentes</v-chip>
        </v-chip-group>
      </div>
      <div class="actions-bar">
        <v-btn @click="openStampModal(null)" color="primary" variant="flat">
          <v-icon start>mdi-plus-box-outline</v-icon>
          Nova Estampa
        </v-btn>
        <v-btn @click="openFolderModal(null)" variant="tonal">
          <v-icon start>mdi-folder-plus-outline</v-icon>
          Nova Pasta
        </v-btn>
        <v-slide-x-transition>
          <v-btn
            v-if="pendingStamps.length > 0 && filterStatus === 'pending'"
            @click="approveAllPending"
            color="success"
            variant="flat"
            :loading="isBulkApproving"
          >
            <v-icon start>mdi-check-all</v-icon>
            Aprovar Pendentes em Massa ({{ pendingStamps.length }})
          </v-btn>
        </v-slide-x-transition>
      </div>
    </div>

    <div v-if="activeFolder" class="folder-header">
      <v-btn @click="activeFolder = null" variant="text" size="small" class="back-button">
        <v-icon start>mdi-arrow-left</v-icon>
        Voltar
      </v-btn>
      <h2 class="text-h5 font-weight-bold">{{ activeFolder.name }}</h2>
      <v-btn icon="mdi-pencil-outline" variant="text" size="small" @click="openFolderModal(activeFolder)"></v-btn>
    </div>
    <v-divider v-if="activeFolder" class="mb-6"></v-divider>

    <div class="content-area">
      <div v-if="loadingStamps" class="loading-state">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <div v-else-if="!activeFolder">
        <v-row v-if="filteredFolders.length > 0">
          <v-col v-for="folder in filteredFolders" :key="folder.id" cols="12" sm="6" md="4" lg="3">
            <StampFolderCard
              :folder="folder"
              :stamp-count="getStampsInFolder(folder.id).length"
              @click="activeFolder = folder"
              @delete="deleteFolder"
              @edit="openFolderModal"
              @drop-stamp="handleStampDrop"
            />
          </v-col>
        </v-row>
        <div v-if="unassignedStamps.length > 0" class="mt-8">
          <v-divider class="mb-6"></v-divider>
          <h2 class="text-h5 font-weight-bold mb-4">Estampas sem Pasta</h2>
          <v-row>
            <v-col v-for="item in unassignedStamps" :key="item.id" cols="6" sm="4" md="3" lg="2">
              <StampCard :stamp="item" @delete="deleteStamp" @toggle-approval="toggleApprovalStatus" @remove-from-folder="removeStampFromFolder" />
            </v-col>
          </v-row>
        </div>
      </div>

      <div v-else>
        <v-row>
          <v-col v-for="item in filteredStampsInFolder" :key="item.id" cols="6" sm="4" md="3" lg="2">
            <StampCard :stamp="item" @delete="deleteStamp" @toggle-approval="toggleApprovalStatus" @remove-from-folder="removeStampFromFolder" />
          </v-col>
        </v-row>
      </div>

      <div v-if="!loadingStamps && finalFilteredStamps.length === 0 && filteredFolders.length === 0" class="empty-state">
        <v-icon size="64" class="mb-2">mdi-image-off-outline</v-icon>
        <p>Nenhuma estampa encontrada para os filtros selecionados.</p>
      </div>
    </div>

    <StampFolderFormModal :show="showFolderModal" :folder-data="selectedFolder" @close="showFolderModal = false" @save="handleFolderSave" />
    <StampFormModal :show="showStampModal" :stamp-data="selectedStamp" :folders="folders" @close="showStampModal = false" @save="handleStampSave" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import StampFolderCard from '@/components/admin/StampFolderCard.vue';
import StampCard from '@/components/admin/StampCard.vue';
import StampFolderFormModal from '@/components/admin/StampFolderFormModal.vue';
import StampFormModal from '@/components/admin/StampFormModal.vue';

type Stamp = { id: number; name: string; image_url: string; folder_id: number | null; is_approved_for_sale: boolean; gestao_click_service_id: string; };
type Folder = { id: number; name: string; };

const loadingStamps = ref(true);
const search = ref('');
const filterStatus = ref('all');
const allStamps = ref<Stamp[]>([]);
const folders = ref<Folder[]>([]);
const activeFolder = ref<Folder | null>(null);
const showFolderModal = ref(false);
const selectedFolder = ref<Folder | null>(null);
const showStampModal = ref(false);
const selectedStamp = ref<Stamp | null>(null);
const isBulkApproving = ref(false);

const filteredStampsByStatus = computed(() => {
  if (filterStatus.value === 'all') return allStamps.value;
  const isApproved = filterStatus.value === 'approved';
  return allStamps.value.filter(s => s.is_approved_for_sale === isApproved);
});

const finalFilteredStamps = computed(() => {
  if (!search.value) return filteredStampsByStatus.value;
  const q = search.value.toLowerCase();
  return filteredStampsByStatus.value.filter(s => s.name.toLowerCase().includes(q) || s.gestao_click_service_id.toString().includes(q));
});

const filteredFolders = computed(() => {
  if (!search.value) return folders.value;
  const q = search.value.toLowerCase();
  return folders.value.filter(f => f.name.toLowerCase().includes(q));
});

const pendingStamps = computed(() => {
  return finalFilteredStamps.value.filter(s => !s.is_approved_for_sale);
});

const getStampsInFolder = (folderId: number) => allStamps.value.filter(s => s.folder_id === folderId);

const filteredStampsInFolder = computed(() => {
  if (!activeFolder.value) return [];
  return finalFilteredStamps.value.filter(s => s.folder_id === activeFolder.value!.id);
});

const unassignedStamps = computed(() => finalFilteredStamps.value.filter(s => s.folder_id === null));

const handleStampDrop = async ({ folderId, stampId }: { folderId: number, stampId: number }) => {
    const stamp = allStamps.value.find(s => s.id === stampId);
    if (stamp) stamp.folder_id = folderId;
    const { error } = await supabase.from('stamp_library').update({ folder_id: folderId }).eq('id', stampId);
    if (error) await fetchData();
};

const removeStampFromFolder = async (stamp: Stamp) => {
  const originalFolderId = stamp.folder_id;
  stamp.folder_id = null;
  try {
    const { error } = await supabase.from('stamp_library').update({ folder_id: null }).eq('id', stamp.id);
    if (error) throw error;
  } catch (err) {
    console.error("Erro ao remover estampa da pasta:", err);
    stamp.folder_id = originalFolderId;
  }
};

const toggleApprovalStatus = async (stamp: Stamp) => {
  const newStatus = !stamp.is_approved_for_sale;
  const originalStatus = stamp.is_approved_for_sale;
  stamp.is_approved_for_sale = newStatus;
  try {
    const { error } = await supabase.from('stamp_library').update({ is_approved_for_sale: newStatus }).eq('id', stamp.id);
    if (error) throw error;
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    stamp.is_approved_for_sale = originalStatus;
  }
};

const approveAllPending = async () => {
  if (confirm(`Tem certeza que deseja aprovar ${pendingStamps.value.length} estampas pendentes?`)) {
    isBulkApproving.value = true;
    try {
      const idsToApprove = pendingStamps.value.map(s => s.id);
      const { error } = await supabase
        .from('stamp_library')
        .update({ is_approved_for_sale: true })
        .in('id', idsToApprove);

      if (error) throw error;

      allStamps.value.forEach(stamp => {
        if (idsToApprove.includes(stamp.id)) {
          stamp.is_approved_for_sale = true;
        }
      });

      filterStatus.value = 'approved';

    } catch (err) {
      console.error("Erro ao aprovar estampas em massa:", err);
    } finally {
      isBulkApproving.value = false;
    }
  }
};

const fetchData = async () => {
  loadingStamps.value = true;
  try {
    const [stampsRes, foldersRes] = await Promise.all([
      supabase.from('stamp_library').select('*').order('created_at', { ascending: false }),
      supabase.from('stamp_folders').select('*').order('name')
    ]);
    if (stampsRes.error) throw stampsRes.error;
    if (foldersRes.error) throw foldersRes.error;
    allStamps.value = stampsRes.data || [];
    folders.value = foldersRes.data || [];
  } finally {
    loadingStamps.value = false;
  }
};

const openFolderModal = (folder: Folder | null) => {
  selectedFolder.value = folder ? { ...folder } : null;
  showFolderModal.value = true;
};
const handleFolderSave = async () => {
  await fetchData();
  showFolderModal.value = false;
};
const openStampModal = (stamp: Stamp | null) => {
  selectedStamp.value = stamp;
  showStampModal.value = true;
}
const handleStampSave = async () => {
  await fetchData();
  showStampModal.value = false;
}
const deleteFolder = async (folderId: number) => {
  if (confirm('Tem certeza? Todas as estampas nesta pasta ficarão sem pasta.')) {
    await supabase.from('stamp_folders').delete().eq('id', folderId);
    await fetchData();
  }
}
const deleteStamp = async (stampId: number) => {
  if (confirm('Tem certeza que deseja apagar esta estampa?')) {
    const stampToDelete = allStamps.value.find(s => s.id === stampId);
    if (stampToDelete) {
      const filePath = stampToDelete.image_url.split('/stamp-library/')[1];
      if (filePath) await supabase.storage.from('stamp-library').remove([decodeURIComponent(filePath)]);
    }
    await supabase.from('stamp_library').delete().eq('id', stampId);
    await fetchData();
  }
}
onMounted(fetchData);
</script>

<style scoped lang="scss">
.stamp-catalog-container { display: flex; flex-direction: column; }
.catalog-header { text-align: center; margin-bottom: 2rem; }
.search-bar { max-width: 600px; }
.actions-bar {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
}
.folder-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
  .back-button { color: #a0a0a0; }
}
.content-area { flex-grow: 1; }
.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: #757575;
  font-style: italic;
  min-height: 300px;
}
</style>
