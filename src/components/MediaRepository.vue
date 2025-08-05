<template>
  <v-dialog v-model="props.show" max-width="900px" persistent @update:modelValue="emit('close')">
    <v-card class="glassmorphism-card">
      <v-card-title class="glassmorphism-toolbar">
        <span class="text-h5">Repositório de Mídias</span>
        <v-spacer></v-spacer>
        <v-btn icon @click="emit('close')" variant="text">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="py-4 media-repository-content">
        <div v-if="loadingMedia" class="d-flex justify-center align-center fill-height">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else-if="mediaItems.length === 0" class="text-center text-grey-lighten-1 py-4">
          Nenhuma mídia encontrada neste canal.
        </div>
        <v-row v-else>
          <v-col cols="6" sm="4" md="3" v-for="item in mediaItems" :key="item.id">
            <v-card class="media-item" flat tile>
              <v-img v-if="item.message_type === 'image'" :src="item.display_content" aspect-ratio="1" cover class="media-thumbnail"></v-img>
              <div v-else class="file-thumbnail">
                <v-icon size="64">mdi-file</v-icon>
              </div>
              <v-overlay :model-value="hoveredItem === item.id" contained class="align-center justify-center media-overlay">
                <div class="overlay-content">
                  <div class="file-name text-center text-caption font-weight-bold">{{ getFileNameFromPath(item.content) }}</div>
                  <v-btn size="small" variant="flat" color="primary" @click="emit('navigateToMessage', item.id)">
                    Contexto
                  </v-btn>
                  <v-btn size="small" variant="flat" color="grey-darken-1" :href="item.display_content" target="_blank" download>
                    Download
                  </v-btn>
                </div>
              </v-overlay>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from 'vue';
import { supabase } from '@/api/supabase'; // Certifique-se de que este caminho está correto

const props = defineProps({
  show: Boolean,
  channelId: Number,
});

const emit = defineEmits(['close', 'navigateToMessage']);

type MediaItem = {
    id: number;
    content: string; // O path do arquivo
    display_content: string; // A URL assinada ou pública para exibição
    message_type: 'image' | 'file';
    created_at: string;
};

const mediaItems = ref<MediaItem[]>([]);
const loadingMedia = ref(false);
const hoveredItem = ref<number | null>(null);

const getFileNameFromPath = (path: string): string => {
  return path.split('/').pop() || path;
};

const fetchMediaForChannel = async () => {
    if (!props.channelId) {
        mediaItems.value = [];
        return;
    }
    loadingMedia.value = true;
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('id, content, message_type, created_at')
            .eq('channel_id', props.channelId)
            .in('message_type', ['image', 'file'])
            .order('created_at', { ascending: false }); // Mídias mais recentes primeiro

        if (error) throw error;

        const processedMedia: MediaItem[] = [];
        for (const item of data || []) {
            const filePath = item.content;
            let displayUrl = '';

            const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
            if (publicUrlData && publicUrlData.publicUrl) {
                displayUrl = publicUrlData.publicUrl;
            } else {
                console.warn("getPublicUrl falhou no repositório, tentando createSignedUrl.");
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                    .from('media')
                    .createSignedUrl(filePath, 3600 * 24 * 7); // Válido por 7 dias

                if (signedUrlError) {
                    console.error('Erro ao gerar Signed URL para repositório:', signedUrlError);
                    displayUrl = item.content; // Fallback
                } else {
                    displayUrl = signedUrlData.signedUrl;
                }
            }
            processedMedia.push({ ...item, display_content: displayUrl });
        }
        mediaItems.value = processedMedia;

    } catch (e: any) {
        console.error('Erro ao buscar mídias do repositório:', e);
        mediaItems.value = [];
    } finally {
        loadingMedia.value = false;
    }
};

watch(() => props.show, (newVal) => {
    if (newVal) {
        fetchMediaForChannel();
    } else {
        mediaItems.value = []; // Limpa a lista ao fechar
    }
});
</script>

<style scoped>
.media-repository-content {
  min-height: 200px;
  max-height: 60vh;
  overflow-y: auto;
}

.media-item {
  position: relative;
  height: 150px; /* Altura fixa para miniaturas */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(66, 66, 66, 0.3);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.media-item:hover {
  transform: scale(1.05);
}

.media-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Garante que a imagem preencha o espaço */
}

.file-thumbnail {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #bdbdbd;
}

.media-overlay {
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}
.media-item:hover .media-overlay {
  opacity: 1;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.overlay-content .v-btn {
  width: 100%;
}
.file-name {
  color: white;
  margin-bottom: 8px;
}

/* Glassmorphism styles for modal */
.glassmorphism-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background-color: rgba(30, 30, 30, 0.7) !important;
  border-radius: 12px;
}
.glassmorphism-toolbar {
  background-color: rgba(40, 40, 40, 0.6) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
