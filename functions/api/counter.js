export async function onRequest(context) {
    const { request, env } = context;
  
    // If the KV database hasn't been linked yet, return 0
    if (!env.GOS18_STATS) {
      return new Response(JSON.stringify({ count: 0 }), { status: 200 });
    }
  
    // When the app creates a PDF, it sends a POST request to add +1
    if (request.method === "POST") {
      let count = await env.GOS18_STATS.get("pdf_count");
      count = parseInt(count || "0") + 1;
      await env.GOS18_STATS.put("pdf_count", count.toString());
      return new Response(JSON.stringify({ success: true, count }), { status: 200 });
    }
  
    // When the Admin dashboard opens, it sends a GET request to read the number
    if (request.method === "GET") {
      let count = await env.GOS18_STATS.get("pdf_count");
      return new Response(JSON.stringify({ count: parseInt(count || "0") }), { status: 200 });
    }
  
    return new Response("Method not allowed", { status: 405 });
  }