<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="800px" persistent>
    <v-card class="glassmorphism-card">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Adicionar Cliente</v-toolbar-title>
         <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <v-card-text class="py-4">
        <v-form ref="clientForm">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">Dados Gerais</h3>
          <v-row>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="client.tipo_pessoa"
                :items="tiposPessoa"
                item-title="text"
                item-value="value"
                label="Tipo de Pessoa*"
                variant="outlined"
                :rules="[rules.required]"
                density="compact"
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6" md="8">
               <v-text-field
                v-model="client.nome"
                label="Nome Completo / Razão Social*"
                variant="outlined"
                :rules="[rules.required]"
                autofocus
                density="compact"
              ></v-text-field>
            </v-col>
             <v-col cols="12" sm="6" md="4">
               <v-text-field
                v-model="client.cpf_cnpj"
                :label="client.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'"
                variant="outlined"
                density="compact"
               >
                <template v-slot:append-inner>
                    <v-tooltip v-if="client.tipo_pessoa === 'PJ'" text="Buscar dados pelo CNPJ" location="top">
                        <template v-slot:activator="{ props }">
                            <v-btn
                                v-bind="props"
                                icon="mdi-magnify"
                                variant="text"
                                size="small"
                                @click="buscarCnpj"
                                :loading="isSearchingCnpj"
                                :disabled="!client.cpf_cnpj"
                            ></v-btn>
                        </template>
                    </v-tooltip>
                </template>
               </v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="8">
              <v-text-field
                v-model="client.email"
                label="E-mail"
                type="email"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="client.telefone"
                label="Telefone Comercial"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
             <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="client.celular"
                label="Telefone Celular"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-divider class="my-6"></v-divider>

          <h3 class="text-subtitle-1 font-weight-bold mb-4">Endereço</h3>
           <v-row>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="client.endereco.cep"
                label="CEP"
                variant="outlined"
                @blur="buscarCep"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="client.endereco.logradouro"
                label="Logradouro"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="client.endereco.numero"
                label="Número"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
             <v-col cols="12" sm="8">
              <v-text-field
                v-model="client.endereco.complemento"
                label="Complemento"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="client.endereco.bairro"
                label="Bairro"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="client.endereco.nome_cidade"
                label="Cidade / UF"
                variant="outlined"
                readonly
                density="compact"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-form>
         <v-alert v-if="errorMessage" type="error" class="mt-4" dense text closable @click:close="errorMessage = null">
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="dialog-footer pa-4">
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialog">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="submit"
          :loading="isSubmitting"
        >
          <v-icon start>mdi-content-save</v-icon>
          Salvar Cliente
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, defineProps, defineEmits } from 'vue';
import type { VForm } from 'vuetify/components';
import { gestaoApi } from '@/api/gestaoClick';
import { useUserStore } from '@/stores/user';

defineProps({
  show: Boolean,
});

const emit = defineEmits(['close', 'client-created']);

const userStore = useUserStore();
const clientForm = ref<VForm | null>(null);
const isSubmitting = ref(false);
const isSearchingCnpj = ref(false);
const errorMessage = ref<string | null>(null);
const estados = ref<{id: string, sigla: string}[]>([]);

const createDefaultClient = () => ({
  nome: '',
  tipo_pessoa: 'PF' as 'PF' | 'PJ' | 'ES',
  cpf_cnpj: '',
  email: '',
  telefone: '',
  celular: '',
  endereco: {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade_id: '',
    nome_cidade: '',
    estado: '',
  },
});

const client = ref(createDefaultClient());

const tiposPessoa = [
  { text: 'Pessoa Física', value: 'PF' },
  { text: 'Pessoa Jurídica', value: 'PJ' },
  { text: 'Estrangeiro', value: 'ES' },
];

const rules = {
  required: (v: any) => !!v || 'Campo obrigatório.',
};

const resetForm = () => {
    if (clientForm.value) {
      clientForm.value.reset();
      clientForm.value.resetValidation();
    }
    client.value = createDefaultClient();
    errorMessage.value = null;
};

const closeDialog = () => {
    resetForm();
    emit('close');
}

const buscarCep = async () => {
    const cep = client.value.endereco.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return;
    errorMessage.value = null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        // --- INÍCIO DA CORREÇÃO ---
        // Agora verificamos se a API retornou o campo 'erro'.
        // Se não retornou erro, preenchemos o que tivermos disponível.
        if (data.erro) {
            throw new Error('CEP não encontrado ou inválido.');
        }

        // Preenche o que a API retornou, mesmo que alguns campos venham vazios (caso de CEP geral)
        client.value.endereco.logradouro = data.logradouro || '';
        client.value.endereco.bairro = data.bairro || '';
        client.value.endereco.nome_cidade = `${data.localidade} / ${data.uf}`;
        client.value.endereco.estado = data.uf;

        const estadoEncontrado = estados.value.find(e => e.sigla === data.uf);
        if (estadoEncontrado) {
          const cidadesDoEstado = await gestaoApi.buscarCidades(parseInt(estadoEncontrado.id));
          const cidadeEncontrada = cidadesDoEstado.find(c => c.nome.toLowerCase() === data.localidade.toLowerCase());
          if(cidadeEncontrada) {
            client.value.endereco.cidade_id = cidadeEncontrada.id;
          }
        } else {
          // Não mostra mais erro, apenas avisa no console se o estado não for mapeado
          console.warn(`Não foi possível encontrar o ID do estado para a UF: ${data.uf}`);
        }
        // --- FIM DA CORREÇÃO ---

    } catch (error: any) {
        errorMessage.value = error.message || 'Erro ao buscar CEP.';
        console.error("Erro ao buscar CEP:", error);
    }
}

const buscarCnpj = async () => {
    const cnpj = client.value.cpf_cnpj?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
        errorMessage.value = 'Por favor, insira um CNPJ válido com 14 dígitos.';
        return;
    }
    isSearchingCnpj.value = true;
    errorMessage.value = null;

    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) {
            throw new Error('CNPJ não encontrado ou inválido.');
        }
        const data = await response.json();

        client.value.nome = data.razao_social || '';
        client.value.email = data.email || '';
        client.value.telefone = data.ddd_telefone_1 || '';
        client.value.endereco.cep = data.cep?.replace(/\D/g, '') || '';
        client.value.endereco.logradouro = data.logradouro || '';
        client.value.endereco.numero = data.numero || '';
        client.value.endereco.complemento = data.complemento || '';
        client.value.endereco.bairro = data.bairro || '';

        if (client.value.endereco.cep) {
            await buscarCep();
        }

    } catch (error: any) {
        errorMessage.value = error.message || 'Ocorreu um erro ao buscar os dados do CNPJ.';
        console.error("Erro ao buscar CNPJ:", error);
    } finally {
        isSearchingCnpj.value = false;
    }
}

const submit = async () => {
  if (clientForm.value) {
    const { valid } = await clientForm.value.validate();
    if (!valid) return;

    isSubmitting.value = true;
    errorMessage.value = null;

    try {
        const payload = {
            ...client.value,
            enderecos: [{
                endereco: { ...client.value.endereco }
            }]
        };

        if (userStore.profile?.gestao_click_id) {
          (payload as any).vendedor_id = userStore.profile.gestao_click_id;
        }

      const newClient = await gestaoApi.cadastrarCliente(payload);

      emit('client-created', newClient);
      closeDialog();

    } catch (error: any) {
      errorMessage.value = error.message || "Ocorreu um erro desconhecido.";
    } finally {
      isSubmitting.value = false;
    }
  }
};

onMounted(async () => {
  try {
    estados.value = await gestaoApi.buscarEstados();
  } catch(error: any) {
    console.error("Falha ao carregar lista de estados:", error);
    errorMessage.value = "Não foi possível carregar os dados de estados. A busca de CEP pode não funcionar corretamente.";
  }
});
</script>

<style scoped>
.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
