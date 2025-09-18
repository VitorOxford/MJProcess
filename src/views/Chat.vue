<template>
  <div class="construction-background">
    <v-container class="fill-height d-flex justify-center align-center">
      <v-card class="glassmorphism-card text-center pa-8" max-width="500">
        <v-icon class="animated-icon" color="amber" size="100">mdi-progress-wrench</v-icon>
        <h1 class="text-h4 font-weight-bold mt-6 mb-2">Em Desenvolvimento</h1>
        <p class="text-medium-emphasis">
         - Vitor -
        </p>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
// Nenhum script necessário para esta página estática
</script>

<style scoped lang="scss">
.construction-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #121212;
  background-image: radial-gradient(circle at center, rgba(30, 30, 35, 0.8), #121212);
  overflow: hidden;
}

.glassmorphism-card {
  background-color: rgba(35, 35, 40, 0.75) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px !important;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.animated-icon {
  animation: rotate-wrench 8s linear infinite;
  filter: drop-shadow(0 0 15px rgba(255, 193, 7, 0.5));
}

@keyframes rotate-wrench {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(15deg) scale(1.05);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}
</style>
