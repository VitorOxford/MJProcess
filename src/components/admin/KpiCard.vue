<template>
  <v-card class="kpi-card" :style="`--kpi-color: rgb(var(--v-theme-${color}))`">
    <v-card-text>
      <div class="d-flex align-center">
        <v-icon size="40" :color="color" class="mr-4">{{ icon }}</v-icon>
        <div>
          <div class="text-h5 font-weight-bold">{{ value }}</div>
          <div class="text-caption">{{ title }}</div>
          <div v-if="subtitle" class="text-caption text-disabled mt-1">{{ subtitle }}</div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps({
  title: String,
  value: String,
  icon: String,
  color: String,
  subtitle: String,
});
</script>

<style scoped lang="scss">
.kpi-card {
  border-left: 4px solid var(--kpi-color);
  background-color: rgba(var(--v-theme-surface), 0.7);
}
</style>
