// Lista de domínios que têm permissão para acessar suas funções
const allowedOrigins = [
  'http://localhost:3000', // Para desenvolvimento local
  'https://mjprocess.onrender.com', // Seu site em produção
  'https://mjprocess-test.onrender.com' // ADICIONE ESTA LINHA para o seu ambiente de teste
];

export function getCorsHeaders(requestOrigin: string | null): Headers {
  const headers = new Headers();

  // Se a origem da requisição estiver na nossa lista de permitidos,
  // nós a retornamos no header 'Access-Control-Allow-Origin'.
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers.set('Access-Control-Allow-Origin', requestOrigin);
  }

  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  return headers;
}
