import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Interface para os produtos vindos da API do Gestão Click
interface GestaoClickProduct {
  id: string;
  nome: string;
  estoque: string; // Vem como string da API
  unidade: string;
  valor_venda: string;
  movimenta_estoque: '0' | '1';
}

// URL do seu proxy para a API do Gestão Click
const API_BASE_URL = 'https://mjprocess-proxy.onrender.com/api';

async function fetchProductsFromGestaoClick(): Promise<GestaoClickProduct[]> {
  const response = await fetch(`${API_BASE_URL}/produtos`);
  if (!response.ok) {
    throw new Error(`Falha na requisição de produtos: ${response.statusText}`);
  }
  const responseData = await response.json();
  if (responseData.status !== 'success') {
    throw new Error('Erro ao buscar produtos da API externa.');
  }
  // Filtra apenas produtos que movimentam estoque
  return (responseData.data || []).filter((p: GestaoClickProduct) => p.movimenta_estoque === '1');
}

serve(async (_req) => {
  try {
    // Cliente admin do Supabase para ter permissões de escrita
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Busca todos os produtos do Gestão Click
    const gestaoProducts = await fetchProductsFromGestaoClick();
    if (gestaoProducts.length === 0) {
      throw new Error("Nenhum produto que movimenta estoque foi encontrado no Gestão Click.");
    }

    // 2. Prepara os dados para o upsert na tabela 'stock'
    const stockToSync = gestaoProducts.map(p => ({
      gestao_click_id: p.id,
      fabric_type: p.nome,
      available_meters: parseFloat(p.estoque) || 0,
      base_price: parseFloat(p.valor_venda) || 0,
      // Mapeia a unidade para o padrão do seu banco
      unit_of_measure: p.unidade.toLowerCase() === 'kg' ? 'kg' : 'metro',
    }));

    // 3. Executa o upsert no Supabase na tabela 'stock'
    // onConflict: 'gestao_click_id' garante que se o produto já existir, ele será atualizado.
    const { error } = await supabaseAdmin
      .from('stock')
      .upsert(stockToSync, { onConflict: 'gestao_click_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ message: `Sincronização concluída! ${stockToSync.length} produtos foram processados para a tabela de estoque.` }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
