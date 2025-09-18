<template>
  <v-dialog :model-value="show" max-width="95%" width="550" persistent transition="dialog-bottom-transition">
    <v-card class="alert-card">
      <div class="flashing-border"></div>
      <v-card-text class="pa-6 pa-sm-8 text-center">
        <v-icon class="pulsing-icon mb-4" color="warning" size="80">mdi-alert-decagram-outline</v-icon>

        <h2 class="text-h4 text-sm-h3 font-weight-black alert-title mb-4">ALERTA DE ESTOQUE BAIXO!</h2>

        <p class="text-body-1 text-sm-h6 font-weight-regular alert-message mx-auto" style="max-width: 450px;">
          O estoque de <strong>{{ alert.fabricName }}</strong> está abaixo do limite, restando apenas <strong>{{ alert.remainingStock.toLocaleString('pt-BR') }}</strong> unidades/metros.
        </p>

        <v-btn
          color="white"
          variant="outlined"
          block
          size="large"
          class="mt-8"
          @click="$emit('close')"
        >
          Entendido
        </v-btn>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { LowStockAlert } from '@/stores/app';

defineProps<{
  show: boolean;
  alert: LowStockAlert;
}>();
defineEmits(['close']);
</script>

<style scoped lang="scss">
@keyframes flash-border {
  0%, 100% { box-shadow: 0 0 20px 8px rgba(255, 152, 0, 0.7); } /* Laranja */
  50% { box-shadow: 0 0 20px 8px rgba(211, 47, 47, 0.7); }    /* Vermelho */
}

@keyframes pulse-icon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.alert-card {
  border-radius: 20px !important;
  border: 4px solid transparent;
  background: linear-gradient(135deg, #2a2a2a, #1e1e1e);
  position: relative;
  overflow: hidden;
}

.flashing-border {
  position: absolute;
  top: -5px; left: -5px; right: -5px; bottom: -5px;
  border-radius: 24px;
  animation: flash-border 1.2s infinite ease-in-out;
  z-index: 0;
}

.v-card-text {
  position: relative;
  z-index: 2;
}

.pulsing-icon {
  animation: pulse-icon 1.5s infinite ease-in-out;
  filter: drop-shadow(0 0 15px rgba(255, 152, 0, 0.8));
}

.alert-title {
  color: white;
  text-shadow: 3px 3px 8px rgba(0,0,0,0.8);
  line-height: 1.2;
}

.alert-message {
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
}
</style>
