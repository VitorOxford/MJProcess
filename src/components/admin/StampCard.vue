<template>
    <v-card
      class="stamp-card"
      variant="flat"
      draggable="true"
      @dragstart="onDragStart"
    >
        <div v-if="stamp.is_approved_for_sale" class="approved-badge">
            <v-icon color="white" size="small">mdi-check-decagram</v-icon>
            <v-tooltip activator="parent" location="top">Aprovado para Venda</v-tooltip>
        </div>

        <v-menu>
            <template v-slot:activator="{ props }">
                <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" class="menu-button" @click.stop></v-btn>
            </template>
            <v-list density="compact" min-width="220">
                <v-list-item @click.stop="$emit('toggle-approval', stamp)">
                    <template #prepend>
                        <v-icon :color="stamp.is_approved_for_sale ? 'orange' : 'success'">
                            {{ stamp.is_approved_for_sale ? 'mdi-close-circle-outline' : 'mdi-check-circle-outline' }}
                        </v-icon>
                    </template>
                    <v-list-item-title>{{ stamp.is_approved_for_sale ? 'Remover da Venda' : 'Aprovar para Venda' }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="stamp.folder_id" @click.stop="$emit('remove-from-folder', stamp)">
                    <template #prepend><v-icon>mdi-folder-remove-outline</v-icon></template>
                    <v-list-item-title>Remover da Pasta</v-list-item-title>
                </v-list-item>
                <v-divider class="my-1"></v-divider>
                <v-list-item @click.stop="$emit('delete', stamp.id)">
                    <template #prepend><v-icon color="red-lighten-2">mdi-delete-outline</v-icon></template>
                    <v-list-item-title>Excluir Estampa</v-list-item-title>
                </v-list-item>
            </v-list>
        </v-menu>

        <v-img :src="thumbnailUrl" @error="onImageError" aspect-ratio="1" cover class="stamp-image" @click="openImageModal" />

        <v-card-title class="stamp-title" @click="openImageModal">
            {{ stamp.name }}
        </v-card-title>
        <v-card-subtitle class="text-center pb-2">
            ID: {{ stamp.gestao_click_service_id }}
        </v-card-subtitle>
    </v-card>

    <ImageModal :show="showImageModal" :image-url="stamp.image_url" :file-name="stamp.name" @close="showImageModal = false" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/api/supabase';
import ImageModal from '@/components/ImageModal.vue';

const props = defineProps({
    stamp: { type: Object as () => { id: number; name: string; image_url: string; folder_id: number | null; is_approved_for_sale: boolean; gestao_click_service_id: string; }, required: true }
});
defineEmits(['delete', 'toggle-approval', 'remove-from-folder']);

const showImageModal = ref(false);
const thumbnailHasFailed = ref(false);

const openImageModal = () => { showImageModal.value = true; };

const onDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.stamp.id.toString());
    event.dataTransfer.dropEffect = 'move';
  }
};

const thumbnailUrl = computed(() => {
  if (thumbnailHasFailed.value || !props.stamp.image_url) return props.stamp.image_url || '';
  try {
    const url = new URL(props.stamp.image_url);
    const pathParts = url.pathname.split('/stamp-library/');
    if (pathParts.length < 2) return props.stamp.image_url;
    const filePath = decodeURIComponent(pathParts[1]);
    const { data } = supabase.storage.from('stamp-library').getPublicUrl(filePath, {
      transform: { width: 300, height: 300, resize: 'contain', quality: 80 },
    });
    return data.publicUrl;
  } catch (e) {
    return props.stamp.image_url;
  }
});

const onImageError = () => { if (!thumbnailHasFailed.value) thumbnailHasFailed.value = true; };
</script>

<style scoped lang="scss">
.stamp-card {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background-color: rgba(35, 35, 40, 0.9);
    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    &:active { cursor: grabbing; }
    &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
    }
}
.approved-badge {
    position: absolute;
    top: 10px; left: 10px; z-index: 2;
    background-color: rgba(76, 175, 80, 0.9);
    border-radius: 50%;
    width: 24px; height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.7);
    border: 1px solid rgba(255,255,255,0.2);
}
.menu-button {
    position: absolute;
    top: 4px; right: 4px; z-index: 2;
    color: white;
    background-color: rgba(30, 30, 35, 0.5);
    backdrop-filter: blur(2px);
}
.stamp-image { transition: transform 0.3s ease; }
.stamp-card:hover .stamp-image { transform: scale(1.05); }
.stamp-title {
    font-size: 0.8rem;
    padding: 8px 12px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background-color: rgba(30, 30, 35, 0.8);
    font-weight: 500;
}
</style>
