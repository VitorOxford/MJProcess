<template>
  <v-dialog v-model="props.show" max-width="900px" max-height="90vh" persistent @update:modelValue="emit('close')">
    <v-card class="image-modal-card glassmorphism-card">
      <v-toolbar color="transparent" density="compact">
        <v-spacer></v-spacer>
        <v-btn icon @click="emit('close')" variant="text">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="image-content-wrapper py-0 px-4">
        <div class="image-display-container">
          <img :src="props.imageUrl" :alt="props.fileName" class="responsive-modal-image" />
        </div>
      </v-card-text>

      <v-card-actions class="justify-center py-4">
        <v-btn
          color="primary"
          variant="flat"
          :href="props.imageUrl"
          target="_blank"
          download
          :disabled="!props.imageUrl"
        >
          <v-icon start icon="mdi-download"></v-icon> Download
        </v-btn>
        <v-btn
          color="info"
          variant="outlined"
          @click="copyImageUrl"
          :disabled="!props.imageUrl"
        >
          <v-icon start icon="mdi-content-copy"></v-icon> Copiar Link
        </v-btn>
      </v-card-actions>
      <v-snackbar v-model="showSnackbar" :timeout="2000" color="success">
        Link da imagem copiado!
      </v-snackbar>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue';

const props = defineProps({
  show: Boolean,
  imageUrl: String,
  fileName: String,
});

const emit = defineEmits(['close']);
const showSnackbar = ref(false);

const copyImageUrl = async () => {
  if (props.imageUrl) {
    try {
      await navigator.clipboard.writeText(props.imageUrl);
      showSnackbar.value = true;
    } catch (err) {
      console.error('Falha ao copiar o link:', err);
      // Opcional: mostrar um snackbar de erro
    }
  }
};
</script>

<style scoped>
.image-modal-card {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background-color: rgba(30, 30, 30, 0.75); /* Mais opaco para a imagem */
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.image-content-wrapper {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto; /* Permite scroll se a imagem for maior */
  padding: 16px;
}

.image-display-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.2); /* Fundo sutil para a imagem */
  border-radius: 8px;
  padding: 10px; /* Padding interno para o "contorno" */
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  max-width: 100%; /* Garante que o container não exceda o modal */
  max-height: 100%;
}

.responsive-modal-image {
  max-width: 100%; /* Ajusta a imagem à largura do container */
  max-height: 70vh; /* Limita a altura da imagem para não ser muito grande */
  height: auto;
  display: block;
  object-fit: contain; /* Garante que a imagem se ajuste sem cortar */
  border-radius: 4px; /* Leve arredondamento na imagem */
}

.v-card-actions {
  background-color: rgba(40, 40, 40, 0.6) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
