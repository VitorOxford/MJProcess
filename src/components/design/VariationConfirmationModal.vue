<template>
  <v-dialog :model-value="show" max-width="500px" persistent>
    <v-card class="glassmorphism-card-dialog">
      <v-card-title class="dialog-header">
        <span class="text-h5">Confirmar Alteração</span>
      </v-card-title>
      <v-card-text class="py-4">
        <p>
          Você alterou a referência da estampa para <strong>"{{ newItemName }}"</strong>.
        </p>
        <p class="mt-4">
          Por favor, confirme a natureza desta mudança:
        </p>
      </v-card-text>
      <v-card-actions class="dialog-footer pa-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          @click="$emit('decision', 'name_correction')"
        >
          Apenas Corrigi o Nome
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="$emit('decision', 'new_variation')"
        >
          É uma Nova Variação
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  newItemName: string;
}>();
defineEmits(['decision']);
</script>

<style scoped>
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.dialog-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
