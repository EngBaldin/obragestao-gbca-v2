/**
 * ObraGestão — Cloudflare Worker
 * Proxy seguro para a Anthropic API
 * 
 * A chave ANTHROPIC_API_KEY fica guardada como Secret no Cloudflare
 * e nunca é exposta no frontend.
 * 
 * Deploy:
 *   1. npx wrangler deploy
 *   2. npx wrangler secret put ANTHROPIC_API_KEY
 */

const ALLOWED_ORIGIN = '*'; // Troque por 'https://SEU_USUARIO.github.io' em produção

export default {
  async fetch(request, env) {

    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Só aceita POST em /v1/messages
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    // Valida body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // Garante que o modelo e max_tokens são os esperados
    body.model = body.model || 'claude-sonnet-4-20250514';
    body.max_tokens = Math.min(body.max_tokens || 1500, 4096);

    // Chama a Anthropic API com a chave guardada no Cloudflare
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json',
      },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
