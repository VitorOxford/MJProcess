import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts'
import { getCorsHeaders } from '../_shared/cors.ts' // Importa a nova função
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) throw new Error("Header de autorização não encontrado.");

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error("Usuário não autenticado.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) throw new Error("Perfil do usuário não encontrado.");

    if (profile.role !== 'vendedor') {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado para esta função.' }), {
        headers: new Headers({ ...Object.fromEntries(corsHeaders), 'Content-Type': 'application/json' }),
        status: 403
      });
    }

    const sharedSecret = Deno.env.get('EDITOR_JWT_SECRET')!;
    if (!sharedSecret) throw new Error("A variável de ambiente EDITOR_JWT_SECRET não está configurada.");

    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(sharedSecret),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign", "verify"]);

    const payload = {
      sub: user.id,
      role: profile.role,
      iat: getNumericDate(new Date()),
      exp: getNumericDate(new Date(Date.now() + 5 * 60 * 1000)),
    };

    const jwt = await create({ alg: 'HS512', typ: 'JWT' }, payload, key);

    return new Response(JSON.stringify({ token: jwt }), {
      headers: new Headers({ ...Object.fromEntries(corsHeaders), 'Content-Type': 'application/json' }),
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: new Headers({ ...Object.fromEntries(corsHeaders), 'Content-Type': 'application/json' }),
      status: 400,
    });
  }
});
