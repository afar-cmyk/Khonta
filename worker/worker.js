export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const sync_key = request.headers.get('Sync-Key') || url.searchParams.get('sync_key');
    
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Sync-Key",
          "Access-Control-Max-Age": "86400",
        }
      });
    }

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    };

    if (!sync_key) {
      return new Response(JSON.stringify({ error: "Missing Sync-Key header or sync_key query param" }), { status: 400, headers });
    }

    if (request.method === "GET") {
      try {
        const dataStr = await env.KV.get(sync_key);
        const data = dataStr ? JSON.parse(dataStr) : [];
        return new Response(JSON.stringify({ data }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Error reading from KV" }), { status: 500, headers });
      }
    }

    if (request.method === "POST") {
      try {
        const payloadStr = await request.text();
        await env.KV.put(sync_key, payloadStr);
        return new Response(JSON.stringify({ success: true }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid payload or KV error" }), { status: 400, headers });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }
}
