<template>
  <v-dialog v-model="props.show" max-width="95vw" persistent @update:modelValue="emit('close')">
    <v-card class="image-modal-card glassmorphism-card">
      <v-toolbar dense floating class="glassmorphism-toolbar">
        <v-spacer></v-spacer>
        <v-btn icon @click="emit('close')" variant="text">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-text class="pa-0">
        <v-img :src="props.imageUrl" :alt="props.fileName" contain class="modal-image-display"></v-img>
      </v-card-text>
      <v-card-actions class="justify-center glassmorphism-toolbar">
        <v-btn color="primary" variant="flat" :href="props.imageUrl" target="_blank" download :disabled="!props.imageUrl">
          <v-icon start icon="mdi-download"></v-icon> Download
        </v-btn>
        <v-btn v-if="props.fileType === 'image'" color="primary" variant="flat" @click="shareImage" :disabled="!props.imageUrl">
          <v-icon start icon="mdi-share-variant"></v-icon> Compartilhar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  show: Boolean,
  imageUrl: String,
  fileName: String,
  fileType: String, // 'image' or 'file'
});

const emit = defineEmits(['close']);

const shareImage = async () => {
  if (navigator.share && props.imageUrl) {
    try {
      await navigator.share({
        title: props.fileName || 'Imagem do Chat',
        url: props.imageUrl,
      });
      console.log('Conteúdo compartilhado com sucesso!');
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      alert('Não foi possível compartilhar a imagem.');
    }
  } else {
    alert('A API de compartilhamento não é suportada neste navegador.');
  }
};
</script>

<style scoped>
.image-modal-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background-color: rgba(30, 30, 30, 0.7); /* Fundo um pouco mais escuro */
  border-radius: 12px;
  overflow: hidden;
}

.modal-image-display {
  max-height: 80vh; /* Limita a altura da imagem no modal */
  width: auto; /* Permite que a largura se ajuste */
  display: block; /* Garante que margens automáticas funcionem */
  margin: 0 auto; /* Centraliza a imagem */
}

.glassmorphism-toolbar {
  background-color: rgba(40, 40, 40, 0.6) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.v-card-actions {
  padding: 8px 16px;
}
</style>
