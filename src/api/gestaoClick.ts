// src/api/gestaoClick.ts

const API_BASE_URL = 'https://mjprocess-proxy.onrender.com/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

// Tipagens
type Endereco = { cep?: string; logradouro?: string; numero?: string; complemento?: string; bairro?: string; cidade_id?: string; nome_cidade?: string; estado?: string; }
type ClientPayload = { nome: string; tipo_pessoa: 'PF' | 'PJ' | 'ES'; cpf_cnpj?: string; email?: string; telefone?: string; celular?: string; enderecos?: { endereco: Endereco }[]; cpf?: string; cnpj?: string; vendedor_id?: number; };
type ClientResponse = { id: number; nome: string; }
type Product = { id: string; nome: string; estoque: number | string; unidade: 'M' | 'KG' | string; movimenta_estoque: '0' | '1'; [key: string]: any; };
type Service = { id: string; nome: string; imagem_url?: string; [key: string]: any; };
type SaleStatus = { id: number; nome: string; };
type PaymentMethod = { id: string; nome: string; };

type SalePayload = {
  cliente_id: number;
  situacao_id: number;
  produtos: { produto: { produto_id: string; quantidade: number; valor_venda: string; } }[];
  servicos: { servico: { servico_id: string; quantidade: number; valor_venda: string; } }[];
  pagamentos?: { pagamento: { data_vencimento: string; valor: string; forma_pagamento_id: number | null } }[];
  vendedor_id?: number;
};

const gestaoApi = {
  async cadastrarCliente(clienteData: ClientPayload): Promise<ClientResponse> {
    const payload: Partial<ClientPayload> = {};
    for (const key in clienteData) {
      const value = clienteData[key as keyof ClientPayload];
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) continue;
      if (value !== null && value !== '') { (payload as any)[key] = value; }
    }
    if (payload.cpf_cnpj) {
        if (payload.tipo_pessoa === 'PF') payload.cpf = payload.cpf_cnpj;
        else payload.cnpj = payload.cpf_cnpj;
        delete payload.cpf_cnpj;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/clientes`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      const responseData = await response.json();
      if (!response.ok || responseData.status !== 'success') { throw new Error(responseData?.msg || responseData?.erros?.[0] || `Erro ${response.status}`); }
      return responseData.data;
    } catch (error) { console.error('Erro em cadastrarCliente:', error); throw error; }
  },

  async buscarClientes(termo: string): Promise<ClientResponse[]> {
    if (!termo || termo.length < 2) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/clientes?nome=${encodeURIComponent(termo)}`, { headers: getAuthHeaders() });
      if (!response.ok) return [];
      const responseData = await response.json();
      return responseData.data || [];
    } catch (error) { console.error('Erro em buscarClientes:', error); return []; }
  },

  async buscarProdutos(): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/produtos`, { headers: getAuthHeaders() });
      if (!response.ok) { throw new Error(`Falha na requisição de produtos: ${response.status} ${response.statusText}`); }
      const responseData = await response.json();
      if (responseData.status !== 'success') { throw new Error(responseData?.msg || 'Erro ao buscar produtos da API externa.'); }
      return (responseData.data || []).filter((p: Product) => p.movimenta_estoque === '1');
    } catch (error) { console.error('Erro em buscarProdutos:', error); throw error; }
  },

  async buscarServicos(): Promise<Service[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/servicos`, { headers: getAuthHeaders() });
        if (!response.ok) { throw new Error(`Falha na requisição de serviços: ${response.status} ${response.statusText}`); }
        const responseData = await response.json();
        if (responseData.status !== 'success') { throw new Error(responseData?.msg || 'Erro ao buscar serviços da API externa.'); }
        return responseData.data || [];
    } catch (error) { console.error('Erro em buscarServicos:', error); throw error; }
  },

  async buscarFormasDePagamento(): Promise<PaymentMethod[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/formas_pagamentos`, { headers: getAuthHeaders() });
      if (!response.ok) { throw new Error(`Falha na requisição: ${response.status} ${response.statusText}`); }
      const responseData = await response.json();
      if (responseData.status !== 'success') { throw new Error(responseData?.msg || 'Erro ao buscar formas de pagamento.'); }
      return (responseData.data || []).map((item: any) => item.FormasPagamento);
    } catch (error) { console.error('Erro em buscarFormasDePagamento:', error); throw error; }
  },

  async buscarCidades(estadoId: number): Promise<{id: string, nome: string}[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/cidades?estado_id=${estadoId}`, { headers: getAuthHeaders() });
      if (!response.ok) return [];
      const responseData = await response.json();
      return responseData.data || [];
    } catch (error) { console.error('Erro em buscarCidades:', error); return []; }
  },

  async buscarEstados(): Promise<{id: string, sigla: string}[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/estados`, { headers: getAuthHeaders() });
      if (!response.ok) { throw new Error(`Falha na requisição: ${response.status} ${response.statusText}`); }
      const responseData = await response.json();
      return responseData.data || [];
    } catch (error) { console.error('Erro em buscarEstados:', error); throw error; }
  },

  async getSituacoesVenda(): Promise<SaleStatus[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/situacoes_vendas`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Não foi possível buscar as situações de venda.');
      const data = await response.json();
      return data.data || [];
    } catch (error) { console.error('Erro em getSituacoesVenda:', error); throw error; }
  },

  async buscarProdutoPorId(id: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/produtos/${id}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`Produto ID ${id} não encontrado.`);
        const responseData = await response.json();
        if (responseData.status !== 'success') throw new Error(responseData?.msg || 'Erro ao buscar produto.');
        return responseData.data;
    } catch (error) {
        console.error(`Erro em buscarProdutoPorId para ID "${id}":`, error);
        throw error;
    }
  },

  async atualizarEstoqueProduto(produtoId: string, novoEstoque: number): Promise<any> {
    try {
        const produto = await this.buscarProdutoPorId(produtoId);
        const payload = { ...produto, estoque: novoEstoque.toString() };

        const response = await fetch(`${API_BASE_URL}/produtos/${produtoId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const responseData = await response.json();
        if (!response.ok || responseData.status !== 'success') {
            throw new Error(responseData?.msg || `Erro ao atualizar estoque do produto ID ${produtoId}`);
        }
        return responseData.data;
    } catch (error) {
        console.error(`Erro em atualizarEstoqueProduto para ID "${produtoId}":`, error);
        throw error;
    }
  },

  async cadastrarVenda(vendaData: SalePayload): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/vendas`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(vendaData)
      });
      const responseData = await response.json();
      if (!response.ok || responseData.status !== 'success') {
          throw new Error(responseData?.msg || responseData.erros?.join(', ') || 'Erro ao cadastrar a venda na API externa.');
      }
      return responseData.data;
    } catch (error) {
        console.error('Erro em cadastrarVenda:', error);
        throw error;
    }
  },

  async cadastrarServico(nomeServico: string): Promise<{ id: string; nome: string }> {
    try {
      const payload = {
        nome: nomeServico,
        valor_venda: "0.00",
      };
      const response = await fetch(`${API_BASE_URL}/servicos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const responseData = await response.json();
      if (!response.ok || responseData.status !== 'success') {
        throw new Error(responseData?.msg || responseData?.erros?.[0] || `Erro ao cadastrar serviço`);
      }
      return responseData.data;
    } catch (error) {
      console.error('Erro em cadastrarServico:', error);
      throw error;
    }
  },

  // ===== INÍCIO DA CORREÇÃO: Funções movidas para o local correto e com vírgula =====
  async buscarServicoPorId(id: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/servicos/${id}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`Serviço ID ${id} não encontrado.`);
        const responseData = await response.json();
        if (responseData.status !== 'success') throw new Error(responseData?.msg || 'Erro ao buscar serviço.');
        return responseData.data;
    } catch (error) {
        console.error(`Erro em buscarServicoPorId para ID "${id}":`, error);
        throw error;
    }
  },

  async atualizarServico(servicoId: string, novoNome: string): Promise<any> {
    try {
        const servicoAtual = await this.buscarServicoPorId(servicoId);
        const payload = { ...servicoAtual, nome: novoNome };

        const response = await fetch(`${API_BASE_URL}/servicos/${servicoId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const responseData = await response.json();
        if (!response.ok || responseData.status !== 'success') {
            throw new Error(responseData?.msg || `Erro ao atualizar serviço ID ${servicoId}`);
        }
        return responseData.data;
    } catch (error) {
        console.error(`Erro em atualizarServico para ID "${servicoId}":`, error);
        throw error;
    }
  }
  // ===== FIM DA CORREÇÃO =====
};

export { gestaoApi };
