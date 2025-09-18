<template>
  <v-container fluid class="pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-4">
      <v-toolbar-title class="font-weight-bold text-h5">
        <v-icon start size="32">mdi-currency-usd</v-icon>
        Tabela de Preços
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        variant="solo-filled"
        flat
        density="compact"
        label="Buscar produto..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        style="max-width: 350px;"
        clearable
      ></v-text-field>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>
     <div v-else-if="filteredProducts.length === 0" class="text-center text-grey py-16">
        <v-icon size="48" class="mb-2">mdi-database-off-outline</v-icon>
        <p>Nenhum produto encontrado.</p>
    </div>
    <v-row v-else>
      <v-col
        v-for="item in filteredProducts"
        :key="item.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
            class="price-card"
            :class="`unit--${item.unit}`"
            variant="flat"
        >
          <v-card-text class="d-flex flex-column">
            <div class="mb-3">
              <h3 class="text-h6 font-weight-bold">{{ item.name }}</h3>
              <p class="text-caption text-medium-emphasis">{{ item.composition }}</p>
            </div>

            <div class="info-grid mb-4">
              <div class="info-item">
                <span class="info-label">Gramatura</span>
                <span class="info-value">{{ item.grammage || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Largura</span>
                <span class="info-value">{{ item.width_length || 'N/A' }}</span>
              </div>
               <div class="info-item">
                <span class="info-label">Rolo</span>
                <span class="info-value">{{ item.rolo || 'N/A' }}</span>
              </div>
              <div class="info-item" v-if="item.unit === 'kg'">
                <span class="info-label">Rendimento</span>
                <span class="info-value">{{ item.rendimento || 'N/A' }}</span>
              </div>
               <div class="info-item">
                <span class="info-label">Unidade</span>
                <v-chip
                  :color="item.unit === 'kg' ? 'purple-lighten-2' : 'teal-lighten-1'"
                  size="x-small"
                  variant="flat"
                  label
                  class="mt-1"
                >
                  {{ item.unit }}
                </v-chip>
              </div>
            </div>

            <v-spacer></v-spacer>

            <div v-if="canViewSE" class="price-region">
              <h4 class="region-title">SUDESTE</h4>
              <div class="price-values">
                <div class="price-type"><span>À Vista</span> {{ formatCurrency(item.price_se_cash) }}</div>
                <div class="price-type"><span>A Prazo</span> {{ formatCurrency(item.price_se_term) }}</div>
              </div>
            </div>

            <div v-if="canViewNE" class="price-region mt-2">
              <h4 class="region-title">NORDESTE</h4>
              <div class="price-values">
                <div class="price-type"><span>À Vista</span> {{ formatCurrency(item.price_ne_cash) }}</div>
                <div class="price-type"><span>A Prazo</span> {{ formatCurrency(item.price_ne_term) }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

type Product = {
  id: string;
  name: string;
  composition: string;
  grammage: string;
  unit: 'metro' | 'kg';
  rendimento?: string | null;
  width_length?: string | null;
  rolo?: string | null; // <-- Nova propriedade
  price_se_cash: number;
  price_se_term: number;
  price_ne_cash: number;
  price_ne_term: number;
};

const userStore = useUserStore();
const loading = ref(true);
const search = ref('');
const products = ref<Product[]>([]);

const canViewSE = computed(() => userStore.profile?.allowed_regions?.includes('SE') || userStore.isAdmin);
const canViewNE = computed(() => userStore.profile?.allowed_regions?.includes('NE') || userStore.isAdmin);

const filteredProducts = computed(() => {
  if (!search.value) return products.value;
  const query = search.value.toLowerCase();
  return products.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.composition?.toLowerCase().includes(query)
  );
});

const fetchPrices = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('price_list').select('*').order('name');
    if (error) throw error;
    products.value = data || [];
  } catch (err: any) {
    console.error(`Erro ao buscar tabela de preços: ${err.message}`);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

onMounted(fetchPrices);
</script>

<style scoped lang="scss">
.price-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 5px solid;
  border-radius: 12px;
  background-color: rgba(30, 30, 35, 0.8);
  transition: all 0.2s ease-in-out;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.25);
    border-color: rgba(var(--v-theme-primary), 0.6);
  }

  &.unit--kg {
    border-left-color: #7E57C2; // Roxo
  }
  &.unit--metro {
    border-left-color: #4DB6AC; // Verde-água
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.75rem;
  color: #a0a0a0;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.info-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
}

.price-region {
  background-color: rgba(0,0,0,0.2);
  padding: 8px 12px;
  border-radius: 8px;
}

.region-title {
  font-size: 0.7rem;
  font-weight: bold;
  color: #bdbdbd;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.price-values {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.price-type {
  font-size: 1rem;
  font-weight: bold;
  color: white;

  span {
    font-size: 0.7rem;
    font-weight: 500;
    color: #a0a0a0;
    display: block;
  }
}
</style>
