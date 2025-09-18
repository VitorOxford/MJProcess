<template>
  <v-container>
    <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Gerenciamento de Usuários</v-toolbar-title>
    </v-toolbar>

    <v-data-table
        :headers="headers"
        :items="profiles"
        :loading="loading"
        class="elevation-0 bg-transparent"
        item-value="id"
    >
      <template v-slot:item.full_name="{ item }">
        <div class="d-flex align-center py-2">
          <v-avatar :image="item.avatar_url" size="32" class="mr-3"></v-avatar>
          <span class="font-weight-bold">{{ item.full_name }}</span>
        </div>
      </template>

      <template v-slot:item.role="{ item }">
        <v-chip :color="getRoleColor(item.role)" variant="tonal" size="small">{{ item.role }}</v-chip>
      </template>

      <template v-slot:item.allowed_regions="{ item }">
          <div v-if="item.role === 'vendedor' || item.role === 'admin'">
              <v-chip v-for="region in item.allowed_regions" :key="region" size="small" class="mr-1">
                  {{ region }}
              </v-chip>
              <span v-if="!item.allowed_regions || item.allowed_regions.length === 0" class="text-caption text-grey">Nenhuma</span>
          </div>
          <span v-else class="text-caption text-grey">N/A</span>
      </template>

      <template v-slot:item.actions="{ item }">
        <v-btn v-if="item.id !== userStore.profile?.id" icon="mdi-pencil-outline" variant="text" size="small" @click="openDialog(item)"></v-btn>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="500px" persistent>
      <v-card class="glassmorphism-card">
        <v-card-title class="dialog-header"><span class="text-h5">Editar Usuário</span></v-card-title>
        <v-card-text class="py-4">
          <p class="mb-4"><strong>Usuário:</strong> {{ editedItem.full_name }}</p>
          <v-select
            v-model="editedItem.role"
            :items="['admin', 'vendedor', 'designer', 'producao']"
            label="Cargo (Role)"
            variant="outlined"
          ></v-select>

          <v-select
            v-if="editedItem.role === 'vendedor' || editedItem.role === 'admin'"
            v-model="editedItem.allowed_regions"
            :items="['SE', 'NE']"
            label="Acesso à Tabela de Preços"
            variant="outlined"
            multiple
            chips
            closable-chips
            hint="Selecione as regiões que este usuário pode ver."
            persistent-hint
          ></v-select>
        </v-card-text>
        <v-card-actions class="dialog-footer">
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialog">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" @click="saveItem" :loading="isSaving">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import type { Profile } from '@/types';

const userStore = useUserStore();
const profiles = ref<Profile[]>([]);
const loading = ref(true);
const dialog = ref(false);
const isSaving = ref(false);

const editedItem = ref<Partial<Profile>>({});

const headers = [
  { title: 'Nome Completo', key: 'full_name', width: '35%' },
  { title: 'Cargo', key: 'role' },
  { title: 'Regiões de Preço', key: 'allowed_regions' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' },
];

const fetchProfiles = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) throw error;
    profiles.value = data || [];
  } catch (err) {
    console.error("Erro ao buscar perfis:", err);
  } finally {
    loading.value = false;
  }
};

const openDialog = (item: Profile) => {
    editedItem.value = { ...item };
    dialog.value = true;
};

const closeDialog = () => {
    dialog.value = false;
};

const saveItem = async () => {
    isSaving.value = true;
    try {
        const { id, role, allowed_regions } = editedItem.value;
        const { error } = await supabase
            .from('profiles')
            .update({
                role,
                allowed_regions: (role === 'vendedor' || role === 'admin') ? allowed_regions : []
            })
            .eq('id', id);
        if (error) throw error;
        await fetchProfiles();
        closeDialog();
    } catch (err: any) {
        alert(`Erro ao salvar: ${err.message}`);
    } finally {
        isSaving.value = false;
    }
};

const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
        admin: 'error',
        vendedor: 'primary',
        designer: 'info',
        producao: 'warning',
    };
    return colors[role] || 'grey';
};

onMounted(fetchProfiles);
</script>

<style scoped>
.glassmorphism-card {
  backdrop-filter: blur(15px);
  background-color: rgba(35, 35, 40, 0.85);
  border-radius: 12px;
}
.dialog-header { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
</style>
