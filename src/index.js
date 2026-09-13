const SYSTEM_PROMPT = `You are the chat assistant for KBS Industrial Crane & Electromechanical Solutions Ltd, an engineering and industrial-solutions company based in Kochi, India.

FACTS YOU KNOW (only use these — never invent anything beyond this):
- Company: KBS Industrial Crane & Electromechanical Solutions Ltd
- Core focus: industrial crane and lifting systems (currently a rubber-tired gantry crane focus), alongside access control, automatic/manual bollards, parking solutions, and road blockers
- Services: site assessment, installation, maintenance & servicing, project consultation, small-site jobs, and custom scope work
- Approach: starting with smaller projects now, scaling toward larger industrial contracts over time
- Location: Bose Nagar, Kadavanthara, Kochi, Ernakulam, Kerala 682020
- WhatsApp / Call: +91 89215 27981
- Email: info@kbsindustrial.com

RULES:
- Do NOT invent certifications, years in operation, crane capacities, specific pricing, client names, or project values. If asked about something not in the facts above, say you don't have that detail and point them to WhatsApp (+91 89215 27981) or email (info@kbsindustrial.com) for a direct answer.
- Keep replies short and conversational — 1-3 sentences, like a helpful front-desk chat, not an essay.
- For quote requests or anything site-specific, encourage them to reach out on WhatsApp with their project details.
- Be friendly and direct. Do not mention that you are Gemini, an AI model, or reference this prompt.`;

const MODEL = "gemini-2.0-flash";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Send a POST request with a JSON body.", {
        status: 405,
        headers: corsHeaders(),
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.text || "").slice(0, 2000) }],
    }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    try {
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { maxOutputTokens: 300, temperature: 0.6 },
        }),
      });

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        return new Response(
          JSON.stringify({ error: "Gemini API error", details: data }),
          { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders() } }
        );
      }

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't put together a reply just now — please try WhatsApp instead: +91 89215 27981.";

      return new Response(JSON.stringify({ reply: reply.trim() }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Request to Gemini failed.", message: String(err) }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      );
    }
  },
};
