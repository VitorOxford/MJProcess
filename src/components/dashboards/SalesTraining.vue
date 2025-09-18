<template>
  <v-card class="training-card" color="rgba(30,30,35,0.8)">
    <v-card-title class="pa-4">
      <div class="d-flex align-center" style="width: 100%;">
        <v-icon start color="primary" size="32">mdi-school-outline</v-icon>
        <span class="text-h5 font-weight-bold">Central de Treinamento</span>
        <v-spacer></v-spacer>
        <div class="d-flex align-center flex-column">
          <span class="text-caption text-grey-lighten-1 mb-1">Seu Progresso</span>
          <v-progress-circular
            :model-value="completionPercentage"
            :size="48"
            :width="5"
            color="primary"
          >
            <span class="font-weight-bold">{{ Math.round(completionPercentage) }}%</span>
          </v-progress-circular>
        </div>
      </div>
    </v-card-title>
    <v-divider></v-divider>

    <v-row no-gutters class="fill-height">
      <v-col cols="12" md="8" class="content-panel pa-4">
        <div class="content-viewer-wrapper elevation-5">
          <video
            v-if="activeModule.module_type === 'video'"
            :key="activeModule.id"
            :src="activeModule.content_url"
            controls
            controlslist="nodownload"
            class="main-content-viewer"
            @ended="markAsCompleted(activeModule.id)"
          ></video>
          <iframe
            v-else-if="activeModule.module_type === 'pdf'"
            :key="activeModule.id"
            :src="activeModule.content_url"
            class="main-content-viewer"
            frameborder="0"
          ></iframe>
          <v-img
            v-else-if="activeModule.module_type === 'image'"
            :key="activeModule.id"
            :src="activeModule.content_url"
            class="main-content-viewer"
            contain
          ></v-img>
           <div v-else class="d-flex align-center justify-center fill-height text-grey">
             Selecione um módulo para começar.
           </div>
        </div>

        <div class="d-flex align-center mt-4">
            <h2 class="text-h5 font-weight-bold">{{ activeModule.title }}</h2>
            <v-btn v-if="activeModule.module_type === 'pdf' || activeModule.module_type === 'image'" class="ml-4" icon variant="tonal" :href="activeModule.content_url" target="_blank" download>
                <v-icon>mdi-download</v-icon>
                 <v-tooltip activator="parent" location="top">Baixar {{ activeModule.module_type === 'pdf' ? 'PDF' : 'Imagem' }}</v-tooltip>
            </v-btn>
        </div>

        <div class="mt-6">
          <div v-if="!isCompleted(activeModule.id)">
              <div v-if="activeModule.module_type === 'pdf' || activeModule.module_type === 'image'">
                <v-checkbox
                  v-model="readConfirmation"
                  :label="`Li e compreendi o conteúdo deste ${activeModule.module_type === 'pdf' ? 'documento' : 'informativo'}.`"
                ></v-checkbox>
                <v-btn
                  :disabled="!readConfirmation"
                  color="success"
                  @click="markAsCompleted(activeModule.id)"
                  size="large"
                >
                  Confirmar e Concluir Módulo
                </v-btn>
              </div>
              <div v-else-if="activeModule.module_type === 'video'">
                 <v-btn
                  color="success"
                  @click="markAsCompleted(activeModule.id)"
                  size="large"
                >
                  Marcar como Assistido
                </v-btn>
                <p class="text-caption text-grey mt-2">Ou assista até o final para a conclusão automática.</p>
              </div>
          </div>
           <div v-else class="text-success d-flex align-center">
              <v-icon start>mdi-check-decagram</v-icon>
              <span class="font-weight-bold">Módulo concluído!</span>
           </div>
        </div>
      </v-col>

      <v-col cols="12" md="4" class="playlist-panel">
        <v-list class="bg-transparent py-2" nav>
            <v-list-subheader class="font-weight-bold text-grey-lighten-1">DOCUMENTOS</v-list-subheader>
            <v-list-item
                v-for="moduleItem in documentModules"
                :key="moduleItem.id"
                @click="selectModule(moduleItem)"
                :active="activeModule.id === moduleItem.id"
                class="module-list-item"
                rounded="lg"
                :prepend-icon="moduleItem.module_type === 'pdf' ? 'mdi-file-pdf-box' : 'mdi-image-outline'"
            >
                <v-list-item-title class="text-body-1 font-weight-medium">{{ moduleItem.title }}</v-list-item-title>
                <template v-slot:append>
                <v-icon v-if="isCompleted(moduleItem.id)" color="success" size="large">mdi-check-circle</v-icon>
                </template>
            </v-list-item>

            <v-divider class="my-4"></v-divider>

            <v-list-subheader class="font-weight-bold text-grey-lighten-1">VÍDEOS</v-list-subheader>
             <v-list-item
                v-for="moduleItem in videoModules"
                :key="moduleItem.id"
                @click="selectModule(moduleItem)"
                :active="activeModule.id === moduleItem.id"
                class="module-list-item"
                rounded="lg"
                prepend-icon="mdi-play-circle-outline"
            >
                <v-list-item-title class="text-body-1 font-weight-medium">{{ moduleItem.title }}</v-list-item-title>
                <template v-slot:append>
                <v-icon v-if="isCompleted(moduleItem.id)" color="success" size="large">mdi-check-circle</v-icon>
                </template>
            </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

type TrainingModule = {
  id: string;
  title: string;
  module_type: 'video' | 'pdf' | 'image';
  content_url: string;
  module_order: number;
};

const userStore = useUserStore();
const allModules = ref<TrainingModule[]>([]);
const activeModule = ref<TrainingModule>({ id: '', title: 'Nenhum módulo selecionado', module_type: 'video', content_url: '', module_order: 0 });
const completedModules = ref<Set<string>>(new Set());
const readConfirmation = ref(false);

const videoModules = computed(() => allModules.value.filter(m => m.module_type === 'video'));
const documentModules = computed(() => allModules.value.filter(m => m.module_type === 'pdf' || m.module_type === 'image'));

const completionPercentage = computed(() => {
  if (allModules.value.length === 0) return 0;
  return (completedModules.value.size / allModules.value.length) * 100;
});

const isCompleted = (moduleId: string) => completedModules.value.has(moduleId);

const selectModule = (moduleItem: TrainingModule) => {
  activeModule.value = moduleItem;
  readConfirmation.value = false;
};

const markAsCompleted = async (moduleId: string) => {
  if (isCompleted(moduleId) || !userStore.profile) return;
  try {
    const { error } = await supabase.from('training_progress').insert({
      user_id: userStore.profile.id,
      module_id: moduleId,
    });
    if (error) throw error;
    completedModules.value.add(moduleId);
  } catch (err) {
    console.error('Erro ao marcar como concluído:', err);
  }
};

const fetchTrainingData = async () => {
  if (!userStore.profile) return;

  const { data: modulesData, error: modulesError } = await supabase
    .from('training_modules')
    .select('*')
    .order('module_order', { ascending: true });
  if (modulesError) { console.error("Erro ao buscar módulos:", modulesError); return; }

  allModules.value = modulesData;

  const { data: progressData, error: progressError } = await supabase
    .from('training_progress')
    .select('module_id')
    .eq('user_id', userStore.profile.id);
  if (progressError) { console.error("Erro ao buscar progresso:", progressError); return; }

  completedModules.value = new Set(progressData.map(p => p.module_id));

  if (allModules.value.length > 0) {
    const firstIncomplete = allModules.value.find(m => !isCompleted(m.id));
    activeModule.value = firstIncomplete || allModules.value[0];
  }
};

onMounted(async () => {
    if(!userStore.profile) await userStore.fetchSession();
    fetchTrainingData();
});
</script>

<style scoped lang="scss">
.training-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  min-height: 600px;
}
.content-panel {
  display: flex;
  flex-direction: column;
}
.content-viewer-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background-color: #000;
  flex-grow: 1;
  min-height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.main-content-viewer {
  width: 100%;
  height: 100%;
  background-color: #212121;
}
.playlist-panel {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 650px;
  overflow-y: auto;
  @media (max-width: 960px) {
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    max-height: 350px;
  }
}
.module-list-item {
  margin: 8px 12px;
  transition: all 0.2s ease-in-out;
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }
  &.v-list-item--active {
    background-color: rgba(var(--v-theme-primary), 0.2) !important;
    border-left: 4px solid rgb(var(--v-theme-primary));
  }
}
</style>
