// ── Cloudflare Worker — Proxy seguro para Airtable ──
// El API Key se guarda como variable de entorno secreta en Cloudflare,
// nunca aparece en el código fuente.

const AIRTABLE_BASE_ID = 'appHpq69PCT4qqYUL';
const AIRTABLE_TABLE   = 'UBICACIONES';

const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, env) {

    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // ── GET /buscar?usuario=Nombre&evento=ID ──
      // Busca si ya existe un registro para ese par usuario+evento
      if (request.method === 'GET' && url.pathname === '/buscar') {
        const usuario = url.searchParams.get('usuario');
        const evento  = url.searchParams.get('evento');

        if (!usuario || !evento) {
          return json({ error: 'Faltan parámetros usuario o evento' }, 400, corsHeaders);
        }

        const filter = encodeURIComponent(`AND({Usuario}="${usuario}", {ID DEL EVENTO}="${evento}")`);
        const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}?filterByFormula=${filter}`;

        const res = await fetch(airtableUrl, {
          headers: { 'Authorization': `Bearer ${env.AIRTABLE_API_KEY}` }
        });

        const data = await res.json();
        return json(data, res.status, corsHeaders);
      }

      // ── POST /crear ──
      if (request.method === 'POST' && url.pathname === '/crear') {
        const body = await request.json();

        const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        return json(data, res.status, corsHeaders);
      }

      // ── PATCH /actualizar/:id ──
      if (request.method === 'PATCH' && url.pathname.startsWith('/actualizar/')) {
        const recordId = url.pathname.split('/actualizar/')[1];
        const body = await request.json();

        const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}/${recordId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        const data = await res.json();
        return json(data, res.status, corsHeaders);
      }

      return json({ error: 'Ruta no encontrada' }, 404, corsHeaders);

    } catch (err) {
      return json({ error: err.message }, 500, corsHeaders);
    }
  }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}
