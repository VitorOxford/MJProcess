<template>
  <v-card class="dashboard-card" style="min-height: 400px;">
    <v-card-title class="font-weight-bold">{{ title }}</v-card-title>
    <v-card-text style="height: calc(100% - 64px);">
      <slot></slot>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps({
  title: String
});
</script>
