export async function onRequest(context) {
    const { request, env } = context;
  
    if (!env.GOS18_STATS) {
      return new Response(JSON.stringify({ total: 0, byDate: {}, byLocation: {} }), { status: 200 });
    }
  
    // Fetch the master analytics object (or create a blank one if it's the first time)
    let stats = await env.GOS18_STATS.get("master_analytics", { type: "json" });
    if (!stats) {
      stats = { total: 0, byDate: {}, byLocation: {} };
    }
  
    // --- LOGGING A NEW PDF ---
    if (request.method === "POST") {
      stats.total += 1;
  
      // 1. Tally the Date (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];
      stats.byDate[today] = (stats.byDate[today] || 0) + 1;
  
      // 2. Tally the Location (Using Cloudflare's coarse routing data, NO IP stored)
      const city = request.cf?.city || "Unknown City";
      const region = request.cf?.region || "";
      const locString = region ? `${city}, ${region}` : city;
      
      stats.byLocation[locString] = (stats.byLocation[locString] || 0) + 1;
  
      // Save the updated object back to the database
      await env.GOS18_STATS.put("master_analytics", JSON.stringify(stats));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
  
    // --- READING THE STATS ---
    if (request.method === "GET") {
      return new Response(JSON.stringify(stats), { status: 200 });
    }
  
    return new Response("Method not allowed", { status: 405 });
  }