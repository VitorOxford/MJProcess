<template>
  <v-container fluid class="pa-md-8 pa-4">
    <v-row>
      <v-col cols="12">
         <v-toolbar color="transparent" class="mb-4 px-0">
            <v-toolbar-title class="font-weight-bold text-h5">
                <v-icon start>mdi-school-outline</v-icon>
                Central de Treinamento e Didático
            </v-toolbar-title>
         </v-toolbar>
      </v-col>
      <v-col cols="12">
        <SalesTraining />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// O componente SalesTraining foi mantido pois já continha a lógica da Udemy.
// Agora ele é chamado em uma página dedicada.
import SalesTraining from '@/components/dashboards/SalesTraining.vue';
</script>
