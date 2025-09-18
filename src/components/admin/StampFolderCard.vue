<template>
  <v-card
    class="folder-card"
    :class="{ 'drag-over': isDragOver }"
    variant="flat"
    @click="$emit('click')"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <v-card-text class="d-flex flex-column align-center justify-center text-center fill-height">
      <v-icon class="folder-icon" size="64">mdi-folder-multiple-image</v-icon>
      <h4 class="text-h6 font-weight-bold mt-4">{{ folder.name }}</h4>
      <p class="text-caption text-medium-emphasis">{{ stampCount }} estampa(s)</p>
    </v-card-text>
    <v-menu>
        <template v-slot:activator="{ props }">
            <v-btn
                icon="mdi-dots-vertical"
                variant="text"
                size="small"
                class="menu-button"
                v-bind="props"
                @click.stop
            ></v-btn>
        </template>
        <v-list density="compact">
            <v-list-item @click.stop="$emit('delete', folder.id)">
                <template #prepend><v-icon size="small">mdi-delete-outline</v-icon></template>
                <v-list-item-title>Excluir Pasta</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  folder: { type: Object as () => { id: number; name: string; }, required: true },
  stampCount: { type: Number, default: 0 }
});

const emit = defineEmits(['click', 'delete', 'drop-stamp']);

const isDragOver = ref(false);

const onDragOver = () => {
  isDragOver.value = true;
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = (event: DragEvent) => {
  isDragOver.value = false;
  if (event.dataTransfer) {
    const stampId = event.dataTransfer.getData('text/plain');
    if (stampId) {
      emit('drop-stamp', {
        folderId: props.folder.id,
        stampId: parseInt(stampId, 10)
      });
    }
  }
};
</script>

<style scoped lang="scss">
.folder-card {
  position: relative;
  background-color: rgba(35, 35, 40, 0.7);
  border-radius: 16px;
  border: 2px dashed transparent;
  cursor: pointer;
  transition: transform 0.2s ease-out, border-color 0.2s ease-out, background-color 0.2s ease-out;
  height: 200px;

  &.drag-over {
    border-color: rgba(var(--v-theme-primary), 0.8);
    background-color: rgba(var(--v-theme-primary), 0.2);
  }

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(var(--v-theme-primary), 0.5);
    .folder-icon {
      transform: scale(1.1);
    }
  }
}
.folder-icon {
  transition: all 0.2s ease-in-out;
  color: #a0a0a0;
}
.menu-button {
    position: absolute;
    top: 8px;
    right: 8px;
    color: #a0a0a0;
    &:hover { color: white; }
}
</style>
